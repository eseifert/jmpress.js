/*!
 * jmpress.js
 *
 * a jQuery port of https://github.com/bartaz/impress.js based on the power of
 * CSS3 transforms and transitions in modern browsers and inspired by the idea
 * behind prezi.com.
 *
 * Copyright 2012, Kyle Robinson Young @shama
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Based on the foundation laid by Bartek Szopka @bartaz
 */

(function( $, document, window ) {
	/**
	 * Default Settings
	 */
	var defaults = {
		/* CLASSES */
		stepSelector: '.step'
		,canvasClass: 'canvas'
		,notSupportedClass: 'not-supported'
		,loadedClass: 'loaded'

		/* CONFIG */
		,useHash: true

		/* ANIMATION */
		,animation: {
			transformOrigin: 'top left'
			,transitionProperty: 'all'
			,transitionDuration: '1s'
			,transitionDelay: '500ms'
			,transitionTimingFunction: 'ease-in-out'
			,transformStyle: "preserve-3d"
		}

		/* CALLBACKS */
		// TODO documentation
		,beforeChange: []
		,initStep: []
		,applyStep: []
		,setInactive: []
		,setActive: []
		,selectInitialStep: []
		,selectPrev: []
		,selectNext: []
		,loadStep: []

		/* TEST */
		,test: false
	};

	/**
	 * Vars used throughout plugin
	 */
	var jmpress = null
		,settings = null
		,canvas = null
		,steps = null
		,current = null
		,active = false
		,callbacks = {
			'beforeChange': 1
			,'initStep': 1
			,'applyStep': 1
			,'setInactive': 1
			,'setActive': 1
			,'selectInitialStep': 1
			,'selectPrev': 1
			,'selectNext': 1
			,'loadStep': 1
		}
		,ignoreHashChange = false;

	/**
	 * 3D and 2D engines
	 */
	var engines = {
		3: {
			_transform: function( el, data ) {
				var transform = data.prepend || '';
				if ( data.rotate && data.rotate.revert ) {
					transform += data.rotate ? methods._engine._rotate(data.rotate) : '';
					transform += data.translate ? methods._engine._translate(data.translate) : '';
				} else {
					transform += data.translate ? methods._engine._translate(data.translate) : '';
					transform += data.rotate ? methods._engine._rotate(data.rotate) : '';
				}
				transform += data.scale ? methods._engine._scale(data.scale) : '';
				methods.css(el, $.extend({}, { transform: transform }, data.css));
				return true;
			}
			/**
			 * Translate
			 *
			 * @access protected
			 * @return String CSS for translate3d
			 */
			,_translate: function ( t ) {
				return " translate3d(" + t.x + "px," + t.y + "px," + t.z + "px) ";
			}
			/**
			 * Rotate
			 *
			 * @access protected
			 * @return String CSS for rotate
			 */
			,_rotate: function ( r ) {
				var rX = " rotateX(" + r.x + "deg) ",
					rY = " rotateY(" + r.y + "deg) ",
					rZ = " rotateZ(" + r.z + "deg) ";
				return r.revert ? rZ + rY + rX : rX + rY + rZ;
			}
			/**
			 * Scale
			 *
			 * @access protected
			 * @return String CSS for scale
			 */
			,_scale: function ( s ) {
				return " scaleX(" + s.x + ") scaleY(" + s.y + ") scaleZ(" + s.z + ") ";
			}
		}
		,2: {
			_transform: function( el, data ) {
				var transform = data.prepend || '';
				if ( data.rotate && data.rotate.revert ) {
					transform += data.rotate ? methods._engine._rotate(data.rotate) : '';
					transform += data.translate ? methods._engine._translate(data.translate) : '';
				} else {
					transform += data.translate ? methods._engine._translate(data.translate) : '';
					transform += data.rotate ? methods._engine._rotate(data.rotate) : '';
				}
				transform += data.scale ? methods._engine._scale(data.scale) : '';
				methods.css(el, $.extend({}, { transform: transform }, data.css));
				return true;
			}
			/**
			 * Translate
			 *
			 * @access protected
			 * @return String CSS for translate3d
			 */
			,_translate: function ( t ) {
				return " translate(" + t.x + "px," + t.y + "px) ";
			}
			/**
			 * Rotate
			 *
			 * @access protected
			 * @return String CSS for rotate
			 */
			,_rotate: function ( r ) {
				return " rotate(" + r.z + "deg) ";
			}
			/**
			 * Scale
			 *
			 * @access protected
			 * @return String CSS for scale
			 */
			,_scale: function ( s ) {
				return " scaleX(" + s.x + ") scaleY(" + s.y + ") ";
			}
		}
		,1: {
			_transform: function( el, data ) {
				if ( data.translate ) {
					el.animate({
						top: data.translate.y - ( el.height() / 2 ) + 'px'
						,left: data.translate.x - ( el.width() / 2 ) + 'px'
					}, 1000); // TODO: Use animation duration
				}
				return true;
			}
		}
	};

	/**
	 * Methods
	 */
	var methods = {
		/**
		 * Initialize jmpress
		 */
		init: function( args ) {
			// MERGE SETTINGS
			settings = $.extend({}, defaults, args);

			// accept functions and arrays of functions as callbacks
			for(var callbackName in callbacks) {
				if( settings[callbackName] == null )
					settings[callbackName] = [];
				else if( $.isFunction( settings[callbackName] ) )
					settings[callbackName] = [ settings[callbackName] ];
				// merge new callbacks with defaults
				// this is required if callbacks are set in defaults
				if(defaults[callbackName] !== settings[callbackName])
					settings[callbackName] = $.merge(defaults[callbackName], settings[callbackName]);
			}

			// BEGIN INIT
			jmpress = $( this );

			// CHECK FOR SUPPORT
			if (methods._checkSupport() === false) {
				return;
			}

			canvas = $('<div />').addClass( settings.canvasClass );
			jmpress.children().each(function() {
				canvas.append( $( this ) );
			});
			jmpress.append( canvas );
			
			steps = $(settings.stepSelector, jmpress);

			document.documentElement.style.height = "100%";

			$('body').css({
				height: '100%'
				,overflow: 'hidden'
			});

			var props = {
				position: "absolute"
				,transitionDuration: '0s'
			};
			props = $.extend({}, settings.animation, props);
			methods.css(jmpress, props);
			methods.css(jmpress, {
				top: '50%'
				,left: '50%'
				,perspective: '1000px'
			});
			methods.css(canvas, props);

			current = {
				translate: {x: 0, y: 0, z: 0}
				,rotate:   {x: 0, y: 0, z: 0}
				,scale:    {x: 1, y: 1, z: 1}
			};

			// INITIALIZE EACH STEP
			steps.each(function( idx ) {
				var data = methods._dataset( this );
				var step = {
					translate: {
						x: data.x || 0
						,y: data.y || 0
						,z: data.z || 0
					}
					,rotate: {
						x: data.rotateX || 0
						,y: data.rotateY || 0
						,z: data.rotateZ || data.rotate || 0
					}
					,scale: {
						x: data.scaleX || data.scale || 1
						,y: data.scaleY || data.scale || 1
						,z: data.scaleZ || 1
					}
					,prepend: 'translate(-50%,-50%)'
				};

				var callbackData = {
					data: data
					,stepData: step
				}
				methods._callCallback( 'initStep', $(this), callbackData);

				$(this).data('stepData', step);

				if ( !$(this).attr('id') ) {
					$(this).attr('id', 'step-' + (idx + 1));
				}

				methods.css($(this), {
					position: "absolute"
					,transformStyle: "preserve-3d"
				});
				methods._callCallback( 'applyStep', $(this), callbackData);
				methods._engine._transform( $(this), step );
			});

			// KEYDOWN EVENT
			$(document).keydown(function( event ) {
				if ( event.keyCode == 9 || ( event.keyCode >= 32 && event.keyCode <= 34 ) || (event.keyCode >= 37 && event.keyCode <= 40) ) {
					switch( event.keyCode ) {
						case 33:; // pg up
						case 37:; // left
						case 38:   // up
							methods.prev();
						break;
						case 9:; // tab
						case 32:; // space
						case 34:; // pg down
						case 39:; // right
						case 40:   // down
							methods.next();
						break; 
					}
					event.preventDefault();
				}
			});

			// START 
			methods.select( methods._callCallback( 'selectInitialStep', null, { steps: steps }) );

		}
		/**
		 * Select a given step
		 *
		 * @param Object|String el element to select
		 * @param String type reason of changing step
		 * @return Object element selected
		 */
		,select: function ( el, type ) {
			if ( typeof el === 'string') {
				el = jmpress.find( el ).first();
			}
			if ( !el || !$(el).data('stepData') ) {
				return false;
			}

			// Sometimes it's possible to trigger focus on first link with some keyboard action.
			// Browser in such a case tries to scroll the page to make this element visible
			// (even that body overflow is set to hidden) and it breaks our careful positioning.
			//
			// So, as a lousy (and lazy) workaround we will make the page scroll back to the top
			// whenever slide is selected
			//
			// If you are reading this and know any better way to handle it, I'll be glad to hear about it!
			window.scrollTo(0, 0);

			var step = $(el).data('stepData');

			var cancelSelect = false;
			methods._callCallback( "beforeChange", el, {
				stepData: step
				,cancel: function() {
					cancelSelect = true;
				}
			} );
			if(cancelSelect)
				return;

			var target = {
				rotate: {
					x: -parseInt(step.rotate.x, 10)
					,y: -parseInt(step.rotate.y, 10)
					,z: -parseInt(step.rotate.z, 10)
					,revert: false
				},
				scale: {
					x: 1 / parseFloat(step.scale.x)
					,y: 1 / parseFloat(step.scale.y)
					,z: 1 / parseFloat(step.scale.z)
				},
				translate: {
					x: -step.translate.x
					,y: -step.translate.y
					,z: -step.translate.z
				}
			};

			if ( active ) {
				if ( active.attr('id') === el.attr('id') ) {
					return el;
				}
				methods._callCallback( 'setInactive', active, {
					stepData: $(active).data('stepData')
					,target: target
					,nextStep: el
					,nextStepData: step
				} );
			}
			methods._callCallback( 'setActive', el, {
				stepData: step
				,target: target
			} );
			jmpress.attr('class', 'step-' + el.attr('id'));

			var props,
				zoomin = target.scale.x >= current.scale.x;

			props = {
				// to keep the perspective look similar for different scales
				// we need to 'scale' the perspective, too
				perspective: step.scale.x * 1000 + "px"
			};
			props = $.extend({}, settings.animation, props);
			if (!zoomin) {
				props.transitionDelay = '0';
			}
			if (!active) {
				props.transitionDuration = '0';
				props.transitionDelay = '0';
			}
			methods.css(jmpress, props);
			methods._engine._transform(jmpress, {
				scale: target.scale
			});
			
			target.rotate.revert = true;
			props = {
			};
			props = $.extend({}, settings.animation, props);
			if (zoomin) {
				props.transitionDelay = '0';
			}
			if (!active) {
				props.transitionDuration = '0';
				props.transitionDelay = '0';
			}
			//methods.css(canvas, props);
			methods._engine._transform(canvas, {
				translate: target.translate
				,rotate: target.rotate
				,css: props
			});

			$( settings.stepSelector ).css('z-index', 9);
			el.css('z-index', 10);

			current = target;
			active = el;

			methods._loadSiblings();

			return el;
		}
		/**
		 * Alias for select
		 */
		,goTo: function( el ) {
			return methods.select( el, "jump" );
		}
		/**
		 * Goto Next Slide
		 *
		 * @return Object newly active slide
		 */
		,next: function() {
			return methods.select( methods.getNext(), "next" );
		}
		/**
		 * Goto Previous Slide
		 *
		 * @return Object newly active slide
		 */
		,prev: function() {
			return methods.select( methods.getPrev(), "prev" );
		}
		/**
		 * Get Next Slide
		 * 
		 * @return Object
		 */
		,getNext: function() {
			return methods._callCallback( 'selectNext', active, {
				stepData: $(active).data('stepData')
				,steps: steps
			} );
		}
		/**
		 * Get Previous Slide
		 * 
		 * @return Object
		 */
		,getPrev: function() {
			return methods._callCallback( 'selectPrev', active, {
				stepData: $(active).data('stepData')
				,steps: steps
			} );
		}
		/**
		 * Manipulate the canvas
		 *
		 * @param Object props
		 * @return Object canvas
		 */
		,canvas: function( props ) {
			methods.css(canvas, props);
			return canvas;
		}
		/**
		 * Set CSS on element w/ prefixes
		 *
		 * @return Object element which properties were set
		 * 
		 * TODO: Consider bypassing pfx and blindly set as jQuery 
		 * already checks for support
		 */
		,css: function ( el, props ) {
			var key, pkey, css = {};
			for ( key in props ) {
				if ( props.hasOwnProperty(key) ) {
					pkey = methods._pfx(key);
					if ( pkey != null ) {
						css[pkey] = props[key];
					}
				}
			}
			el.css(css);
			return el;
		}
		/**
		 * Return default settings
		 *
		 * @return Object
		 */
		,defaults: function() {
			return defaults;
		}
		/**
		 * Return current settings
		 * 
		 * @return Object
		 */
		,settings: function() {
			return settings;
		}
		/**
		 * Call a callback
		 *
		 * @param callbackName String callback which should be called
		 * @param arguments some arguments to the callback
		 */
		,_callCallback: function( callbackName, element, eventData ) {
			eventData.settings = settings;
			eventData.current = current;
			var result = {};
			$.each( settings[callbackName], function(idx, callback) {
				result.value = callback.call( jmpress, element, eventData ) || result.value;
			});
			return result.value;
		}
		/**
		 * Load Siblings
		 * If a slide has data-src or href set load that slide dynamically
		 *
		 * @access protected
		 * @return void
		 */
		,_loadSiblings: function() {
			if (!active) {
				return false;
			}
			var siblings = active.siblings( settings.stepSelector );
			siblings.push( active );
			siblings.each(function() {

				if ($(this).hasClass( settings.loadedClass )) {
					return;
				}
				methods._callCallback( 'loadStep', this, {
					stepData: $(this).data('stepData')
				} )
				$(this).addClass( settings.loadedClass );
			});
		}
		/**
		 * Set supported prefixes
		 *
		 * @access protected
		 * @return Function to get prefixed property
		 */
		,_pfx: (function () {
			var style = document.createElement('dummy').style,
				prefixes = 'Webkit Moz O ms Khtml'.split(' '),
				memory = {};
			return function ( prop ) {
				if ( typeof memory[ prop ] === "undefined" ) {
					var ucProp  = prop.charAt(0).toUpperCase() + prop.substr(1),
						props   = (prop + ' ' + prefixes.join(ucProp + ' ') + ucProp).split(' ');
					memory[ prop ] = null;
					for ( var i in props ) {
						if ( style[ props[i] ] !== undefined ) {
							memory[ prop ] = props[i];
							break;
						}
					}
				}
				return memory[ prop ];
			}
		})()
		/**
		 * Return dataset for element
		 * 
		 * @param Object element
		 * @return Object
		 */
		,_dataset: function( el ) {
			if ( el.dataset ) {
				return el.dataset;
			}
			function toCamelcase( str ) {
				str = str.split( '-' );
				for( var i = 1; i < str.length; i++ )
					str[i] = str[i].substr(0, 1).toUpperCase() + str[i].substr(1);
				return str.join( '' );
			}
			var dataset = {};
			var attrs = $(el)[0].attributes;
			$.each( attrs, function ( idx, attr ) {
				if( attr.nodeName.substr(0, 5) == "data-" )
					dataset[ toCamelcase(attr.nodeName.substr(5)) ] = attr.nodeValue;
			});
			return dataset;
		}
		/**
		 * Check for support
		 *
		 * @access protected
		 * @return void
		 */
		,_checkSupport: function() {
			var ua = navigator.userAgent.toLowerCase();
			var supported = ( ua.search(/(iphone)|(ipod)|(android)/) == -1 );
			if (!supported) {
				jmpress.addClass( settings.notSupportedClass );
			}
			return supported;
		}
		/**
		 * Return supported Engine
		 *
		 * @access protected
		 * @return an transformator
		 */
		,_getSupportedEngine: function() {
			if (methods._pfx("perspective")) {
				return engines[3];
			} else if (methods._pfx("transform")) {
				return engines[2];
			} else {
			    return engines[1];
			}
		}
		/**
		 * Engine to power cross-browser translate, scale and rotate.
		 */
		,_engine: {}
	};

	methods._engine = methods._getSupportedEngine();

	/**
	 * $.jmpress()
	 */
	$.fn.jmpress = function( method ) {
		if ( methods[method] ) {
			if ( method.substr(0, 1) == '_' && settings.test === false) {
				$.error( 'Method ' +  method + ' is protected and should only be used internally.' );
			} else {
				return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
			}
		} else if ( callbacks[method] ) {
			var func = Array.prototype.slice.call( arguments, 1 )[0];
			if ($.isFunction( func )) {
				settings[method] = settings[method] || [];
				settings[method].push(func);
			}
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.jmpress' );
		}
		// to allow chaining
		return this;
	};
	$.extend({
		jmpress: function( method ) {
			if ( methods[method] ) {
				if ( method.substr(0, 1) == '_' && settings.test === false) {
					$.error( 'Method ' +  method + ' is protected and should only be used internally.' );
				} else {
					return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
				}
			} else if ( callbacks[method] ) {
				// plugin interface
				var func = Array.prototype.slice.call( arguments, 1 )[0];
				if ($.isFunction( func )) {
					defaults[method].push(func);
				} else $.error( 'Second parameter should be a function: $.jmpress( callbackName, callbackFunction )' );
			} else {
				$.error( 'Method ' +  method + ' does not exist on jQuery.jmpress' );
			}
		}
	});

	/* DEFAULT PLUGINS */

	(function() { // active class
		$.jmpress( 'defaults' ).activeClass = "active";
		$.jmpress( 'setInactive', function( step, eventData ) {
			$(step).removeClass( eventData.settings.activeClass );
		});
		$.jmpress( 'setActive', function( step, eventData ) {
			$(step).addClass( eventData.settings.activeClass );
		});
	})();

	(function() { // circular stepping
		$.jmpress( 'selectInitialStep', function( step, eventData ) {
			return $( eventData.steps[0] );
		});
		$.jmpress( 'selectPrev', function( step, eventData ) {
			if (!step) {
				return false;
			}
			var prev = $(step).prev( eventData.settings.stepSelector );
			if (prev.length < 1) {
				prev = eventData.steps.last( eventData.settings.stepSelector );
			}
			if (prev.length > 0) {
				return prev;
			}
		});
		$.jmpress( 'selectNext', function( step, eventData ) {
			if (!step) {
				return false;
			}
			var next = $(step).next( eventData.settings.stepSelector );
			if (next.length < 1) {
				next = eventData.steps.first( eventData.settings.stepSelector );
			}
			if (next.length > 0) {
				return next;
			}
		});
	})();

	(function() { // load steps from ajax
		$.jmpress( 'initStep', function( step, eventData ) {
			eventData.stepData.ajaxSource = $(step).attr('href') || eventData.data['src'] || false;
		});
		$.jmpress( 'loadStep', function( step, eventData ) {
			var href = eventData.stepData.ajaxSource;
			if ( href ) {
				$(step).load( href );
			}
		});
	})();

	(function() { // use hash in url
		$.jmpress( 'selectInitialStep', function( step, eventData ) {
			// HASH CHANGE EVENT
			if(eventData.settings.useHash) {
				/**
				 * getElementFromUrl
				 *
				 * @return String or undefined
				 */
				function getElementFromUrl() {
					// get id from url # by removing `#` or `#/` from the beginning,
					// so both "fallback" `#slide-id` and "enhanced" `#/slide-id` will work
					var el = $('#' + window.location.hash.replace(/^#\/?/,"") );
					return el.length > 0 ? el : undefined;
				}
				$(window).bind('hashchange', function() {
					if (eventData.current.ignoreHashChange === false) {
						$.jmpress('select' ,getElementFromUrl() );
					}
					eventData.current.ignoreHashChange = false;
				});
				return getElementFromUrl();
			}
		});
		$.jmpress( 'setActive', function( step, eventData ) {
			// `#/step-id` is used instead of `#step-id` to prevent default browser
			// scrolling to element in hash
			if(eventData.settings.useHash) {
				eventData.current.ignoreHashChange = true;
				window.location.hash = "#/" + step.attr('id');
				setTimeout(function() {
					eventData.current.ignoreHashChange = false;
				}, 1000); // TODO: Use animation duration
			}
		});
})();
})(jQuery, document, window);
