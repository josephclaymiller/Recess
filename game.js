// This uses the Sprite.js library.

'use strict' ;

//==== configuration ===================================================

var POPULATION= 20 ;
var SCENE_WIDTH= 1920 ;
var SCENE_HEIGHT= 1080 ;
var MAX_MOVE= 10 ;
var MAX_ACCELERATE= 5 ;
var SECONDS_PER_TICK= 0.1 ;

var ALIKE_BUMP_INFLUENCE= 0.1 ;
var INFLUENCE_RANGE= 200 ;

var STATUS_DISTRIBUTION= [69, 15, 10, 5, 1] ;
var AGGRESSION_DISTRIBUTION= [ [10, 2],
			       [10, -2],
			       [80, 0]
			     ] ;

var STATUS_SIZES= [0.4, 0.8, 1.2, 1.6, 2] ;

//======================================================================

// One person is:
// { sp,
//   aggression,
//   status,
//   vx, vy,
//   last_bump,
//   last_bumped,
//   last_bump_strength
// }
var person= [] ;

var scene= sjs.Scene({w: SCENE_WIDTH, h: SCENE_HEIGHT}) ;

// Player happiness
var happiness= 25 ;

var images= 'aggressor1.png aggressor2.png aggressor3.png aggressor4.png aggressor5.png ally1.png ally2.png ally3.png ally4.png ally5.png bystander.png target.png'.split(/\s+/) ;
for (var i= 0 ; i<images.length ; i++)  images[i]= 'images/'+images[i] ;

var ticker= scene.Ticker(tick, {tickDuration: SECONDS_PER_TICK*1000}) ;

scene.loadImages(images, function() { init(POPULATION) } ) ;


//======================================================================

function pause_ticker() {
    ticker.pause() ;
}

// work around bug where extra resume() call accelerates ticker, by pausing first.
function resume_ticker() {
    ticker.pause() ;
    ticker.resume() ;
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
	    person= [] ;
	}
    }
    if (attempts>=20)
	alert("We're having trouble placing enough people in this scene.  Either increase the size of the scene, or reduce the population, or reduce the sizes by reducing the percentages of high-status people.") ;

    var audio = new Audio("audio/MUS_RoughMusicBaseIdea.wav");
    audio.play();

    ticker.run() ;
}


function add_person(aggression, pstatus) {    // "status" is a property of Window objects
    var sp= scene.Sprite('images/'+sprite_image(aggression)) ;
    sp.scale(STATUS_SIZES[Math.round(pstatus)-1]) ;
    var does_collide, collisions=0 ;
    do {
	set_random_position(sp) ;
	does_collide= false ;
	for (var i= 0 ; i<person.length ; i++) {
	    if (collides(sp, person[i].sp)) {
		does_collide= true ;
		if (collisions++>100) {
		    sp.remove() ;
		    throw new Error('too many collisions') ;
		}
		break ;
	    }
	}
    } while (does_collide) ;
    var new_person= {sp: sp, aggression: aggression, status: pstatus, vx: 0, vy: 0} ;
    sp.dom.addEventListener('click', function(e) { click_on_person(e, new_person) } , true) ;   // note closure
    new_person.sp.update() ;
    person.push(new_person) ;
}


// unfortunately, the collision detection in sprite.js only checks the boundary
//   rectangles for collision, not the sprites themselves.  So we just use a
//   radius here.
function collides(s1, s2) {
//    return s1.collidesWith(s2) ;   // could also use sp.collidesWithArray(person)
    return ( within_range(s1, s2, ((s1.w*s1.xscale + s2.w*s2.xscale) / Math.SQRT2)) ) ;
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
    for (var i= 0 ; i<person.length ; i++) {
	person[i].old_pos= {x: person[i].sp.x, y: person[i].sp.y} ;
	move_person(person[i]) ;
    }

    // look for collisions
    for (var i= 0 ; i<person.length ; i++)
	for (var j= i+1 ; j<person.length ; j++)
	    if (collides(person[i].sp, person[j].sp)) {
		collide(person[i], person[j]) ;
		person[i].sp.position(person[i].old_pos.x, person[i].old_pos.y) ;
		person[j].sp.position(person[j].old_pos.x, person[j].old_pos.y) ;
	    }

    // clear out dead persons
    var i= 0 ;
    while (i<person.length) {
	if (person[i].sp.xscale==0) {
	    person[i].sp.remove() ;
	    person.splice(i, 1) ;
	} else {
	    i++ ;
	}
    }
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
    if (new_x < sp.w*(sp.xscale-1)/2) new_x= sp.w*(sp.xscale-1)/2, person.vx= 0 ;
    if (new_x > scene.w - sp.w - sp.w*(sp.xscale-1)/2)
	new_x= scene.w - sp.w - sp.w*(sp.xscale-1)/2, person.vx= 0 ;
    if (new_y < sp.h*(sp.yscale-1)/2) new_y= sp.h*(sp.yscale-1)/2, person.vy= 0 ;
    if (new_y > scene.h - sp.h - sp.h*(sp.yscale-1)/2)
	new_y= scene.h - sp.h - sp.h*(sp.yscale-1)/2, person.vy= 0 ;

    person.sp.position(new_x, new_y) ;
    person.sp.update() ;
}


function collide(p1, p2) {
    var audio = new Audio("audio/SFX_Bump_01.wav");
    audio.play();

    // if either both allies or both aggressors
    if (p1.aggression*p2.aggression>0) {
	add_to_aggression(p1, ALIKE_BUMP_INFLUENCE*p2.status*p2.aggression) ;
	add_to_aggression(p2, ALIKE_BUMP_INFLUENCE*p1.status*p1.aggression) ;

    // two bystanders
    } else if ((p1.aggression==0) && (p2.aggression==0)) {
	// do nothing


    //jsm-- what about ally and bystander?

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
	var bump_magnitude= p1.aggression*p1.status + p2.aggression*p2.status ;

	// modify by aggression*status of all within range INFLUENCE_RANGE .
	// this doesn't yet handle "remote allies".
	for (var i= 0 ; i<person.length ; i++)
	    if ((person[i]!==aggressor) && within_range(aggressor.sp, person[i].sp, INFLUENCE_RANGE))
		bump_magnitude+= 0.25*person[i].aggression*person[i].status ;

	var impact_range= bump_magnitude*15 ;

	// apply results of bump

	// acts of bias-motivated violence
	if ((bump_magnitude>40) && (bump_magnitude<45)) {
	    // delete person: mark as dead with scale=0, then sweep out afterward .
	    // otherwise, if we delete from person[] now, will confuse loop in tick() .
	    target.sp.scale(0) ;

	// genocide
	} else if (bump_magnitude>=45) {
	    // delete all allies within impact_range
	    for (var i= 0 ; i<person.length ; i++)
		if ((person[i].aggression<0) && (within_range(aggressor.sp, person[i].sp, impact_range)))
		    person[i].sp.scale(0) ;

	} else {
	    // increase target aggression if target survives-- is this appropriate?
	    if (target.sp.xscale>0) {
		add_to_aggression(target, 0.25*bump_magnitude) ;
	    }
	}

	add_to_aggression(aggressor, 0.25*bump_magnitude) ;

	// increase aggression of all people within impact range-- is this appropriate?
	for (var i= 0 ; i<person.length ; i++)
	    if ((person[i]!==aggressor) && (within_range(aggressor.sp, person[i].sp, impact_range)))
		add_to_aggression(person[i], 0.1*bump_magnitude) ;
    }
}


function click_on_person(e, person) {
    var target= e.target || e.srcElement ;     // MSIE uses e.srcElement
    add_to_aggression(person, -10) ;
}


