// This uses the Sprite.js library.

'use strict' ;

//==== configuration ===================================================

var POPULATION= 50 ;
var SCENE_WIDTH= 1920 ;
var SCENE_HEIGHT= 1080 ;
var MAX_MOVE= 30 ;
var MAX_ACCELERATE= 1 ;
var SECONDS_PER_TICK= 0.1 ;

var ALIKE_BUMP_INFLUENCE= 0.1 ;
var INFLUENCE_RANGE= 200 ;
var CLICK_RANGE= 200 ;

var STATUS_DISTRIBUTION= [69, 15, 10, 5, 1] ;
var AGGRESSION_DISTRIBUTION= [ [2, 10],
			       [8, 2],
			       [90, 0]
			     ] ;

var STATUS_SIZES= [0.4, 0.6, 0.8, 1.0, 1.2] ;

//======================================================================

var people= [] ;

var scene= sjs.Scene({w: SCENE_WIDTH, h: SCENE_HEIGHT}) ;

// Player happiness
var happiness= 25 ;

var images= 'aggressor1.png aggressor2.png aggressor3.png aggressor4.png aggressor5.png ally1.png ally2.png ally3.png ally4.png ally5.png bystander.png target.png'.split(/\s+/) ;
for (var i= 0 ; i<images.length ; i++)  images[i]= 'images/'+images[i] ;

// preload sounds
var sounds= 'MUS_Level_1.wav MUS_Level_2.wav MUS_Level_3.wav SFX_Bump_1.mp3 SFX_Bump_2.mp3 SFX_Bump_3.mp3 SFX_Bump_4.mp3 SFX_Bump_5.mp3 SFX_StartClick.mp3 SFX_New_Ally_Sound_01.mp3 SFX_Make_Friend.mp3 SFX_Click_Aggressor.mp3 SFX_Drag_Ally.mp3 SFX_Support_Target.mp3 SFX_Preemptive_Click.mp3 SFX_Ally_Win.mp3 SFX_Aggressor_Win.mp3 MUS_Player_Win.mp3 MUS_Player_Lose.mp3'.split(/\s+/) ;
var sound= {} ;
for (var i= 0 ; i<sounds.length ; i++)
    try {
	sound[sounds[i]]= new Audio('audio/'+sounds[i]) ;
    } catch(e) {}

var cur_music_level= 1, cur_music ;

var ticker= scene.Ticker(tick, {tickDuration: SECONDS_PER_TICK*1000}) ;

scene.loadImages(images, function() { init(POPULATION) } ) ;


//======================================================================

function pause_ticker() {
    document.getElementById("pause").style.display = "none";
    document.getElementById("resume").style.display = "block";
    ticker.pause() ;
    cur_music.pause() ;
}

// work around bug where extra resume() call accelerates ticker, by pausing first.
function resume_ticker() {
    document.getElementById("resume").style.display = "none";
    document.getElementById("pause").style.display = "block";
    ticker.pause() ;
    ticker.resume() ;
    cur_music.play() ;
}


function update_happiness() {
    document.getElementById("happiness").innerHTML = "Happiness: " + Math.round(happiness*100)/100;
}


function play_sound(s) {
    // sound[s].play() won't work when one sound needs to be played more than
    //   once simultaneously, like for sprite bumps, so just do this.
    new Audio('audio/'+s).play() ;
//    try {
//	sound[s].play() ;
//    } catch(e) {}
}

function play_music(s) {
    try { cur_music.pause() } catch(e) {}
    cur_music= sound[s] ;
    try { cur_music.play() } catch(e) {}
}


function init(num_people) {
    for (var attempts= 0 ; attempts<20 ; attempts++) {
	try {
	    for (var i= 0 ; i<num_people ; i++)
		add_person(random_aggression(), random_status()) ;
	    break ;

	} catch(e) {
	    scene.reset() ;    // kills the ticker too
	    ticker= scene.Ticker(tick, {tickDuration: SECONDS_PER_TICK*1000}) ;
	    people= [] ;
	}
    }
    if (attempts>=20)
	alert("We're having trouble placing enough people in this scene.  Either increase the size of the scene, or reduce the population, or reduce the sizes by reducing the percentages of high-status people.") ;

    play_music('MUS_Level_'+cur_music_level+'.wav') ;

    ticker.run() ;
}


function add_person(aggression, pstatus) {    // "status" is a property of Window objects
    var sp= scene.Sprite('images/'+sprite_image(aggression)) ;
    sp.scale(STATUS_SIZES[Math.round(pstatus)-1]) ;
    var does_collide, collisions=0 ;
    do {
	set_random_position(sp) ;
	does_collide= false ;
	for (var i= 0 ; i<people.length ; i++) {
	    if (collides(sp, people[i].sp)) {
		does_collide= true ;
		if (collisions++>100) {
		    sp.remove() ;
		    throw new Error('too many collisions') ;
		}
		break ;
	    }
	}
    } while (does_collide) ;

    var new_person= {
	sp: sp,
	aggression: aggression,
	status: pstatus,
	vx: 0,
	vy: 0,
	get state() { return person_state(this) },
	get aggression_impact() { return this.aggression*this.status/2 }  // experimenting....
//      last_bump_time,
//      last_bump_by,
//      last_bump_magnitude
    } ;
    sp.dom.addEventListener('click', function(e) { click_on_person(e, new_person) } , true) ;   // note closure
    new_person.sp.update() ;
    people.push(new_person) ;
}


function person_state(person) {
    if (person.aggression>0)  return 'aggressor' ;
    if (person.aggression==0) return 'bystander' ;
    if (person.last_bump_by>0) return 'target' ;   // aggression<0
    return 'ally' ;   // aggression<0 and last_bump_by<0
}


// unfortunately, the collision detection in sprite.js only checks the boundary
//   rectangles for collision, not the sprites themselves.  So we just use a
//   radius here.
function collides(s1, s2) {
//    return s1.collidesWith(s2) ;   // could also use sp.collidesWithArray(people)
    return ( within_range(s1, s2, ((s1.w*s1.xscale + s2.w*s2.xscale) / Math.SQRT2 / 1.3)) ) ;
}

// returns true if the centers of two sprites are within given distance, efficiently
function within_range(s1, s2, dist) {
    var dx= (s1.x+s1.w/2) - (s2.x+s2.w/2) ;
    var dy= (s1.y+s1.h/2) - (s2.y+s2.h/2) ;
    return ((dx*dx+dy*dy) < dist*dist) ;
}


function add_to_aggression(person, increment) {
    person.aggression+= increment ;
    if (person.aggression>50)  person.aggression= 50 ;
    if (person.aggression<-25) person.aggression= -25 ;
    person.sp.loadImg('images/'+sprite_image(person.aggression)) ;
    person.sp.update() ;
}

function sprite_image(aggression) {
    if (aggression<-20)  return 'ally5.png' ;
    if (aggression<-15)  return 'ally4.png' ;
    if (aggression<-10)  return 'ally3.png' ;
    if (aggression<-5)   return 'ally2.png' ;
    if (aggression<0)    return 'ally1.png' ;
    if (aggression==0)   return 'bystander.png' ;
    if (aggression<15)   return 'aggressor1.png' ;
    if (aggression<30)   return 'aggressor2.png' ;
    if (aggression<40)   return 'aggressor3.png' ;
    if (aggression<45)   return 'aggressor4.png' ;
    return 'aggressor5.png' ;
}

function random_status() {
    var r= Math.random()*100 ;
    for (var i= 0 ; i<5 ; i++) {
	if (r<STATUS_DISTRIBUTION[i]) return i+1 ;
	r-= STATUS_DISTRIBUTION[i] ;
    }
    alert('STATUS_DISTRIBUTION does not add up to 100%.') ;
}

function random_aggression() {
    var r= Math.random()*100 ;
    for (var i= 0 ; i<AGGRESSION_DISTRIBUTION.length ; i++) {
	if (r<AGGRESSION_DISTRIBUTION[i][0]) return AGGRESSION_DISTRIBUTION[i][1] ;
	r-= AGGRESSION_DISTRIBUTION[i][0] ;
    }
    alert('AGGRESSION_DISTRIBUTION does not add up to 100%.') ;
}


function set_random_position(sp) {
    // Kinda messy, but that's what Sprite.js requires.  See move_person() for more info.
    var x= Math.random()*(scene.w-sp.w*sp.xscale) + sp.w*(sp.xscale-1)/2 ;
    var y= Math.random()*(scene.h-sp.h*sp.yscale) + sp.h*(sp.yscale-1)/2 ;
    sp.position(x, y) ;
}


function tick() {
    // first, move all people
    for (var i= 0 ; i<people.length ; i++) {
	people[i].old_pos= {x: people[i].sp.x, y: people[i].sp.y} ;
	move_person(people[i]) ;
    }

    // look for collisions
    for (var i= 0 ; i<people.length ; i++)
	for (var j= i+1 ; j<people.length ; j++)
	    if (collides(people[i].sp, people[j].sp)) {
		collide(people[i], people[j]) ;
		people[i].sp.position(people[i].old_pos.x, people[i].old_pos.y) ;
		people[j].sp.position(people[j].old_pos.x, people[j].old_pos.y) ;
		redirect_after_collision(people[i], people[j]) ;
	    }

    // clear out dead people
    var i= 0 ;
    while (i<people.length) {
	if (people[i].sp.xscale==0) {
	    people[i].sp.remove() ;
	    people.splice(i, 1) ;
	} else {
	    i++ ;
	}
    }

    happiness+= 0.2*SECONDS_PER_TICK ;
    if (happiness>25) happiness=25 ;

    // show happiness
    update_happiness();

    if (happiness<0) game_lose() ;


    var lost= true ;
    for (var i= 0 ; i<people.length ; i++)
	if (people[i].aggression<=0) {
	    lost= false ;
	    break ;
	}
    if (lost) game_lose() ;

    var won= true ;
    for (var i= 0 ; i<people.length ; i++)
	if (people[i].aggression>=0) {
	    won= false ;
	    break ;
	}
    if (won) game_win() ;


    var total_status= 0, total_aggression_impact= 0 ;
    for (var i= 0 ; i<people.length ; i++) {
	total_status+= people[i].status ;
	total_aggression_impact+= people[i].aggression_impact ;
    }

    var new_music_level= music_level(total_aggression_impact/total_status) ;
    if (new_music_level!=cur_music_level) play_music('MUS_Level_'+new_music_level+'.wav') ;
}


function music_level(avg_aggression) {
    if (avg_aggression>=5)  return 1 ;
    if (avg_aggression>=25) return 2 ;
    return 3 ;
}



function move_person(person) {
    var sp= person.sp ;
    var dist= Math.random()*MAX_ACCELERATE ;
    var angle= Math.random()*2*Math.PI ;
    var new_vx= person.vx + dist*Math.cos(angle) ;
    var new_vy= person.vy + dist*Math.sin(angle) ;
    var speed2= new_vx*new_vx + new_vy*new_vy ;

    if (speed2 > MAX_MOVE*MAX_MOVE) {
	new_vx*= MAX_MOVE/speed2 ;
	new_vy*= MAX_MOVE/speed2 ;
    }
    person.vx= new_vx ;
    person.vy= new_vy ;

    var new_x= sp.x + new_vx ;
    var new_y= sp.y + new_vy ;

    // Setting max and min positions is messy.  Sprite.js sets the position of
    //   a sprite to the top left corner of the unscaled image, even when the
    //   images is then scaled.  However, scaling an image keeps the same center.
    // I tried to make these formulae clear but failed.
    // Besides setting max and min positions, also reverse vx and vy appropriately,
    //   i.e. sprites bounce off borders.
    if (new_x < sp.w*(sp.xscale-1)/2)
	new_x= sp.w*(sp.xscale-1)/2, person.vx= -person.vx ;
    if (new_x > scene.w - sp.w - sp.w*(sp.xscale-1)/2)
	new_x= scene.w - sp.w - sp.w*(sp.xscale-1)/2, person.vx= -person.vx ;
    if (new_y < sp.h*(sp.yscale-1)/2)
	new_y= sp.h*(sp.yscale-1)/2, person.vy= -person.vy ;
    if (new_y > scene.h - sp.h - sp.h*(sp.yscale-1)/2)
	new_y= scene.h - sp.h - sp.h*(sp.yscale-1)/2, person.vy= -person.vy ;

    person.sp.position(new_x, new_y) ;
    person.sp.update() ;
}


function redirect_after_collision(p1, p2) {
    var v1= Math.sqrt(p1.vx*p1.vx+p1.vy*p1.vy) ;
    var v2= Math.sqrt(p2.vx*p2.vx+p2.vy*p2.vy) ;
    var theta1= Math.atan2(p1.vy, p1.vx) ;
    var theta2= Math.atan2(p2.vy, p2.vx) ;
    var phi= Math.atan2(p1.sp.y-p2.sp.y, p1.sp.x-p2.sp.x) ;

    // From https://en.wikipedia.org/wiki/Elastic_collision#Two-dimensional_collision_with_two_moving_objects
    // Simplified, since the "masses" are treated as being the same, i.e. m1==m2 .
    p1.vx= v2*Math.cos(theta2-phi)*Math.cos(phi) + v1*Math.sin(theta1-phi)*Math.cos(phi+Math.PI/2) ;
    p1.vy= v2*Math.cos(theta2-phi)*Math.sin(phi) + v1*Math.sin(theta1-phi)*Math.sin(phi+Math.PI/2) ;
    p2.vx= v1*Math.cos(theta1-phi)*Math.cos(phi) + v2*Math.sin(theta2-phi)*Math.cos(phi+Math.PI/2) ;
    p2.vy= v1*Math.cos(theta1-phi)*Math.sin(phi) + v2*Math.sin(theta2-phi)*Math.sin(phi+Math.PI/2) ;
}



function collide(p1, p2) {
    play_sound('SFX_Bump_1.mp3') ;

    p1.last_bump_time= p2.last_bump_time= ticker.currentTick ;
    p1.last_bump_by= p2.aggression ;
    p2.last_bump_by= p1.aggression ;


    // now, decide result of collision

    // if either both allies or both aggressors
    if (p1.aggression*p2.aggression>0) {
	add_to_aggression(p1, ALIKE_BUMP_INFLUENCE*p2.aggression_impact) ;
	add_to_aggression(p2, ALIKE_BUMP_INFLUENCE*p1.aggression_impact) ;
	p1.last_bump_magnitude= p2.last_bump_magnitude= p1.aggression_impact + p2.aggression_impact ;

    // two bystanders
    } else if ((p1.aggression==0) && (p2.aggression==0)) {
	// do nothing

	p1.last_bump_magnitude= p2.last_bump_magnitude= 0 ;


    // ally and bystander
    } else if (p1.aggression==0) {
	add_to_aggression(p1, ALIKE_BUMP_INFLUENCE*p2.aggression_impact) ;
	p1.last_bump_magnitude= p2.last_bump_magnitude= p2.aggression_impact ;
    } else if (p2.aggression==0) {
	add_to_aggression(p2, ALIKE_BUMP_INFLUENCE*p1.aggression_impact) ;
	p1.last_bump_magnitude= p2.last_bump_magnitude= p1.aggression_impact ;


    // aggressor and target
    } else {
	var aggressor, target ;
	if (p1.aggression>0) {
	    aggressor= p1 ;
	    target= p2 ;
	} else {
	    aggressor= p2 ;
	    target= p1 ;
	}
	var bump_magnitude= p1.aggression_impact + p2.aggression_impact ;

	// modify by aggression_impact of all within range INFLUENCE_RANGE .
	// this doesn't yet handle "remote allies".
	for (var i= 0 ; i<people.length ; i++)
	    if ((people[i]!==aggressor) && within_range(aggressor.sp, people[i].sp, INFLUENCE_RANGE))
		bump_magnitude+= 0.25*people[i].aggression_impact ;

	var impact_range= bump_magnitude*15 ;

	// apply results of bump

	// acts of bias-motivated violence
	if ((bump_magnitude>40) && (bump_magnitude<45)) {
	    // delete person: mark as dead with scale=0, then sweep out afterward .
	    // otherwise, if we delete from people[] now, will confuse loop in tick() .
	    target.sp.scale(0) ;

	// genocide
	} else if (bump_magnitude>=45) {
	    // delete all allies within impact_range
	    for (var i= 0 ; i<people.length ; i++)
		if ((people[i].aggression<0) && (within_range(aggressor.sp, people[i].sp, impact_range)))
		    people[i].sp.scale(0) ;

	} else {
	    // increase target aggression if target survives-- is this appropriate?
	    if (target.sp.xscale>0) {
		add_to_aggression(target, 0.25*bump_magnitude) ;
	    }
	}

	add_to_aggression(aggressor, 0.25*bump_magnitude) ;

	// increase aggression of all people within impact range-- is this appropriate?
	for (var i= 0 ; i<people.length ; i++)
	    if ((people[i]!==aggressor) && (within_range(aggressor.sp, people[i].sp, impact_range)))
		add_to_aggression(people[i], 0.1*bump_magnitude) ;

	p1.last_bump_magnitude= p2.last_bump_magnitude= bump_magnitude ;
    }
}


function click_on_person(e, person) {
    var state= person.state ;

    if (state=='bystander' || state=='ally')
	add_to_aggression(person, -1) ;

    else if (state=='target') {
	if (person.last_bump_time>ticker.currentTick-5/SECONDS_PER_TICK) {
	    var click_magnitude= -0.5*person.last_bump_magnitude ;
	    for (var i= 0 ; i<people.length ; i++)
		if (people[i]!==person && within_range(person.sp, people[i].sp, CLICK_RANGE))
		    click_magnitude+= 0.25*people[i].aggression_impact ;
	    add_to_aggression(person, click_magnitude) ;
	} else {
	    add_to_aggression(person, -1) ;
	}

    } else {  // person.state=='aggressor'
	var happiness_cost= 0.1*person.aggression_impact ;
	for (var i= 0 ; i<people.length ; i++)
	    if (people[i]!==person && people[i].state=='ally'
		&& within_range(person.sp, people[i].sp, CLICK_RANGE))
	    {
		happiness_cost+= 0.05*people[i].aggression_impact ;
	    }
	happiness-= happiness_cost ;
	if (person.last_bump_time>ticker.currentTick-5/SECONDS_PER_TICK) {
	    var click_magnitude= -0.25*person.last_bump_magnitude ;
	    for (var i= 0 ; i<people.length ; i++)
		if (people[i]!==person && within_range(person.sp, people[i].sp, CLICK_RANGE))
		    click_magnitude+= 0.25*people[i].aggression_impact ;
	    add_to_aggression(person, click_magnitude) ;
	} else {
	    add_to_aggression(person, -1) ;
	}
    }
}


function game_win() {
    ticker.pause() ;
    play_sound('MUS_Player_Win.mp3') ;
}

function game_lose() {
    ticker.pause() ;
    play_sound('MUS_Player_Lose.mp3') ;
}



