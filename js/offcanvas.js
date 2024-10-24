/* ========================================================================
 * Bootstrap: offcanvas.js v3.1.3
 * http://jasny.github.io/bootstrap/javascript/#offcanvas
 * ========================================================================
 * Copyright 2013-2014 Arnold Daniels
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */

+function ($) {

  "use strict";

  var bodyPaddingRight = false;
  var bodyPaddingTimeout = 40;
  var prop = 'margin-right';

  // OFFCANVAS PUBLIC CLASS DEFINITION
  // =================================
  var isIphone = (navigator.userAgent.match(/iPhone/i)) || (navigator.userAgent.match(/iPod/i));
  var OffCanvas = function (element, options) {
    this.$element = $(element);
    this.options  = $.extend({}, OffCanvas.DEFAULTS, options);
    this.state    = null;
    this.placement = null;
    this.$calcClone = null;
    this.absoluteElements = null;
    this.$body = $('body');

    // Absolutely positioned elements that needs position adjustment for sliding
    // method.
    if (options.absoluteElements) {
      this.absoluteElements = options.absoluteElements;
    }

    if (this.options.recalc) {
      this.calcClone();
      $(window).on('resize', $.proxy(this.recalc, this));
    }

    if (this.options.autohide && !this.options.modal) {
      //var eventName = (navigator.userAgent.match(/(iPad|iPhone)/i) === null) ? 'click' : 'touchstart'
      // Removed for now touchstart - its making a big problem for iOS when
      // you click to collapse navbar. For some reason page will be reloaded.
      $(document).on('click', $.proxy(this.autohide, this));
    }

    // Backdrop is added to dropdown on it's open, if device is touchable (or desctop FF, https://github.com/twbs/bootstrap/issues/13748)
    // and dropdown is not inside .navbar-nav. So we remove it
    $(this.$element).on('shown.bs.dropdown', $.proxy(function() {
      $(this.$element).find('.dropdown .dropdown-backdrop').remove();
    }, this));

    if (typeof(this.options.disablescrolling) === "boolean") {
      this.options.disableScrolling = this.options.disablescrolling;
      delete this.options.disablescrolling;
    }

    if (this.options.toggle) {
      this.toggle();
    }
  };

  OffCanvas.DEFAULTS = {
    toggle: true,
    placement: 'auto',
    autohide: true,
    recalc: true,
    disableScrolling: true,
    modal: false,
    // Minimum space between menu and screen edge.
    minspace: 68
  };

  OffCanvas.prototype.setWidth = function () {
    // Lets use getBoundingClientRect instead of $.outerWidth() because this
    // one is buggy (can return wrong results, maybe for position fixed element)
    // and just recently fixed in jQuery 3.3.1.
    // @see https://github.com/jquery/jquery/issues/3193.
    var size = this.$element[0].getBoundingClientRect().width;
    var max = $(window).width();
    // Minimum space between menu and screen edge.
    max -= this.options.minspace;

    this.$element.css('width', size > max ? max : size);
  };

  OffCanvas.prototype.offset = function () {
    switch (this.placement) {
      case 'left':
      case 'right':
        return this.$element[0].getBoundingClientRect().width;
      case 'top':
      case 'bottom':
        return this.$element[0].getBoundingClientRect().height;
    }
  };

  OffCanvas.prototype.calcPlacement = function () {
    if (this.options.placement !== 'auto') {
        this.placement = this.options.placement;
        return;
    }


    var horizontal = $(window).width() / this.$element.width();
    var vertical = $(window).height() / this.$element.height();

    var element = this.$element;
    function ab(a, b) {
      if (element.css(b) === 'auto') {
        return a;
      }
      if (element.css(a) === 'auto') {
        return b;
      }

      var size_a = parseInt(element.css(a), 10);
      var size_b = parseInt(element.css(b), 10);

      return size_a > size_b ? b : a;
    }

    this.placement = horizontal >= vertical ? ab('left', 'right') : ab('top', 'bottom');
  };

  OffCanvas.prototype.opposite = function (placement) {
    switch (placement) {
      case 'top':
        return 'bottom';
      case 'left':
        return 'right';
      case 'bottom':
        return 'top';
      case 'right':
        return 'left';
    }
  };

  OffCanvas.prototype.getCanvasElements = function() {
    // Return a set containing the canvas plus all fixed elements
    var canvas = this.options.canvas ? $(this.options.canvas) : this.$element;

    var fixed_elements = canvas.find('*').filter(function() {
      return getComputedStyle(this).getPropertyValue('position') === 'fixed'
    }).not(this.options.exclude);

    return canvas.add(fixed_elements)
  };

  OffCanvas.prototype.slide = function (elements, offset, callback) {
    var placement = this.placement;
    var opposite = this.opposite(placement);

    elements.each(function() {
      if ($(this).css(placement) !== 'auto') {
        $(this).css(placement, (parseInt($(this).css(placement), 10) || 0) + offset);
      }

      if ($(this).css(opposite) !== 'auto') {
        $(this).css(opposite, (parseInt($(this).css(opposite), 10) || 0) - offset);
      }
    });

    this.$element.one("transitionend", callback);
  };

  OffCanvas.prototype.disableScrolling = function() {
    var bodyWidth = this.$body.width();

    if (this.$body.data('offcanvas-style') === undefined) {
      this.$body.data('offcanvas-style', this.$body.attr('style') || '');
    }

    this.$body.css('overflow', 'hidden');
    //Fix iPhone scrolling
    if (isIphone) {
      this.$body.addClass('lockIphone');
    }

    if (this.$body.width() > bodyWidth) {
      // Difference with current body width will give us scrollbar width.
      // This is the amount of the right margin that we need to compensate.
      bodyPaddingRight = parseInt(this.$body.css(prop), 10) + this.$body.width() - bodyWidth;

      if (this.isPushMethod()) {
        // When we are pushing we need to tweak right body padding after
        // some time.
        setTimeout($.proxy(function() {
          this.$body.css(prop, bodyPaddingRight);
        }, this), 1);
      }
      else {
        // As soon as we start sliding tweak body right padding and also check
        // any absolutely positioned element.
        this.$body.css(prop, bodyPaddingRight);
        if (this.absoluteElements) {
          this.absoluteElements.forEach(function (element) {
            $(element).css(prop, bodyPaddingRight);
          });
        }
      }
    }
    //disable scrolling on mobiles (they ignore overflow:hidden)
    this.$body.on('touchmove.bs', function(e) {
      if (!$(e.target).closest('.offcanvas').length)
        e.preventDefault();
    });
  };

  OffCanvas.prototype.enableScrolling = function() {
    this.$body.off('touchmove.bs');
    this.$body.removeClass('lockIphone');
  };

  OffCanvas.prototype.show = function () {
    if (this.state) {
      return;
    }

    var startEvent = $.Event('show.bs.offcanvas');
    this.$element.trigger(startEvent);
    if (startEvent.isDefaultPrevented()) {
      return;
    }

    this.state = 'slide-in';
    this.$element.css('width', '');
    // Show the element so we can properly calculate needed dimensions.
    if (!this.$element.hasClass('in')) {
      this.$element.css('visibility', 'hidden').addClass('in');
    }
    this.calcPlacement();
    this.setWidth();
    var offset = this.offset();
    // Hide the element after all needed calculations.
    if (this.$element.css('visibility') === 'hidden') {
      this.$element.removeClass('in').css('visibility', '');
    }

    var elements = this.getCanvasElements();
    var placement = this.placement;
    var opposite = this.opposite(placement);

    if (elements.index(this.$element) !== -1) {
      $(this.$element).data('offcanvas-style', $(this.$element).attr('style') || '');
      this.$element.css(placement, -1 * offset);
      // Workaround: Need to get the CSS property for it to be applied before
      // the next line of code.
      this.$element.css(placement);
    }

    elements.addClass('canvas-sliding').each(function() {
      var $this = $(this);
      if ($this.data('offcanvas-style') === undefined) $this.data('offcanvas-style', $this.attr('style') || '');
      if ($this.css('position') === 'static' && !isIphone) $this.css('position', 'relative');
      if (($this.css(placement) === 'auto' || $this.css(placement) === '0px') &&
          ($this.css(opposite) === 'auto' || $this.css(opposite) === '0px')) {
        $this.css(placement, 0);
      }
    });

    if (this.options.disableScrolling) {
      this.disableScrolling();
      // Remove body padding which looks ugly after push sliding is fully in.
      if (bodyPaddingRight && this.isPushMethod()) {
        setTimeout($.proxy(function() {
          this.$body.css(prop, 0);
        }, this), bodyPaddingTimeout);
      }
    }
    if (this.options.modal || this.options.backdrop) {
      this.toggleBackdrop();
    }

    var complete = function () {
      if (this.state !== 'slide-in') {
        return;
      }

      this.state = 'slid';

      elements.removeClass('canvas-sliding').addClass('canvas-slid');
      this.$element.trigger('shown.bs.offcanvas');
    };

    setTimeout($.proxy(function() {
      this.$element.addClass('in');
      this.slide(elements, offset, $.proxy(complete, this));
    }, this), 1);
  };

  OffCanvas.prototype.hide = function () {
    if (this.state !== 'slid') {
      return;
    }

    var startEvent = $.Event('hide.bs.offcanvas');
    this.$element.trigger(startEvent);
    if (startEvent.isDefaultPrevented()) {
      return;
    }

    this.state = 'slide-out';

    var elements = $('.canvas-slid');
    var offset = -1 * this.offset();

    var complete = function () {
      if (this.state !== 'slide-out') {
        return;
      }

      this.state = null;
      this.placement = null;

      this.$element.removeClass('in');

      elements.removeClass('canvas-sliding');
      // Because below disableScrolling is using setTimeout, we need to use
      // setTimeout here also in order to avoid any race thread problems and
      // to control better that first disableScrolling is done and then
      // this code here.
      setTimeout($.proxy(function() {
        elements.add(this.$element).add('body').each(function() {
          $(this).attr('style', $(this).data('offcanvas-style')).removeData('offcanvas-style');
        });
        // When sliding also remove any right padding of absolute elements.
        if (!this.isPushMethod() && this.absoluteElements) {
          this.absoluteElements.forEach(function (element) {
            $(element).attr('style', '');
          });
        }
      }, this), 250);

      this.$element.css('width', '');
      this.$element.trigger('hidden.bs.offcanvas');
    };

    if (this.options.disableScrolling) {
      this.enableScrolling();
      // Restore body padding while slide animation is working so we avoid
      // ugly horizontal body jumping when scrollbar is enabled again.
      if (bodyPaddingRight && this.isPushMethod()) {
        setTimeout($.proxy(function() {
          this.$body.css(prop, bodyPaddingRight);
          // When sliding we need to do the same thing for absolute elements.
          if (!this.isPushMethod() && this.absoluteElements) {
            this.absoluteElements.forEach(function (element) {
              $(element).css(prop, bodyPaddingRight);
            });
          }
        }, this), bodyPaddingTimeout);
      }
    }
    if (this.options.modal || this.options.backdrop) {
      this.toggleBackdrop();
    }

    elements.removeClass('canvas-slid').addClass('canvas-sliding');

    setTimeout($.proxy(function() {
      this.slide(elements, offset, $.proxy(complete, this));
    }, this), 1);
  };

  OffCanvas.prototype.toggle = function () {
    if (this.state === 'slide-in' || this.state === 'slide-out') {
      return;
    }
    this[this.state === 'slid' ? 'hide' : 'show']();
  };

  /**
   * Returns true if we are using push method.
   *
   * @return {*|boolean}
   */
  OffCanvas.prototype.isPushMethod = function () {
    // Push is happening when canvas is body.
    return this.options.canvas && $(this.options.canvas)[0] === this.$body[0];
  };

  OffCanvas.prototype.toggleBackdrop = function (callback) {
    callback = callback || $.noop;
    var time = 150;

    if (this.state === 'slide-in') {
      this.$backdrop = $('<div class="modal-backdrop fade" />');
      if (this.options.backdrop) {
        this.$backdrop.addClass('allow-navbar');

        if (this.options.canvas && $(this.options.canvas)[0] !== this.$body[0]) {
          $(this.options.canvas).addClass('limit-backdrop');
          this.$backdrop.appendTo(this.options.canvas);
        } else {
          this.$backdrop.insertAfter(this.$element);
        }
      } else {
        this.$backdrop.insertAfter(this.$element);
      }

      // Force reflow.
      // @todo - doAnimate does not exist?
      //if (doAnimate) {
      //  this.$backdrop[0].offsetWidth;
      //}

      this.$backdrop.addClass('in');
      this.$backdrop.on('click.bs', $.proxy(this.autohide, this));
      this.$backdrop.one('transitionend', callback);
    }
    else if (this.state === 'slide-out' && this.$backdrop) {
      this.$backdrop.removeClass('in');
      this.$body.off('touchmove.bs');
      var self = this;
      this.$backdrop.one('transitionend', function() {
        self.$backdrop.remove();
        callback();
        self.$backdrop = null;
      });

      if (this.options.canvas && $(this.options.canvas)[0] !== this.$body[0]) {
        var canvas = this.options.canvas;
        setTimeout(function() {
          $(canvas).removeClass('limit-backdrop')
        }, time);
      }
    }
    else if (callback) {
      callback()
    }
  };

  OffCanvas.prototype.calcClone = function() {
    this.$calcClone = $('.offcanvas-clone');

    if (!this.$calcClone.length) {
      this.$calcClone = this.$element.clone()
        .addClass('offcanvas-clone')
        .appendTo(this.$body)
        .html('');
    }

    this.$calcClone.removeClass('in');
  };

  OffCanvas.prototype.recalc = function () {
    if (this.$calcClone.css('display') === 'none' || (this.state !== 'slid' && this.state !== 'slide-in')) {
      return;
    }

    this.state = null;
    this.placement = null;
    var elements = this.getCanvasElements();

    this.$element.trigger('hide.bs.offcanvas');
    this.$element.removeClass('in');

    elements.removeClass('canvas-slid');
    elements.add(this.$element).add('body').each(function() {
      $(this).attr('style', $(this).data('offcanvas-style')).removeData('offcanvas-style');
    });

    this.$element.trigger('hidden.bs.offcanvas');
  };

  OffCanvas.prototype.autohide = function (e) {
    if ($(e.target).closest(this.$element).length === 0) {
      this.hide();
    }
    var target = $(e.target);
    if (!target.hasClass('dropdown-backdrop') && $(e.target).closest(this.$element).length === 0) {
      this.hide();
    }
  };

  // OFFCANVAS PLUGIN DEFINITION
  // ==========================

  var old = $.fn.offcanvas;

  $.fn.offcanvas = function (option) {
    return this.each(function () {
      var $this   = $(this);
      var data    = $this.data('bs.offcanvas');
      var options = $.extend({}, OffCanvas.DEFAULTS, $this.data(), typeof option === 'object' && option);

      if (!data) {
        $this.data('bs.offcanvas', (data = new OffCanvas(this, options)));
      }
      if (typeof option === 'string') {
        data[option]();
      }
    })
  };

  $.fn.offcanvas.Constructor = OffCanvas;


  // OFFCANVAS NO CONFLICT
  // ====================

  $.fn.offcanvas.noConflict = function () {
    $.fn.offcanvas = old;
    return this;
  };


  // OFFCANVAS DATA-API
  // =================

  $(document).on('click.bs.offcanvas.data-api', '[data-toggle=offcanvas]', function (e) {
    var $this   = $(this), href;
    var target  = $this.attr('data-target')
        || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, ''); //strip for ie7
    var $canvas = $(target);
    var data    = $canvas.data('bs.offcanvas');
    var option  = data ? 'toggle' : $this.data();

    e.preventDefault();
    e.stopPropagation();

    if (data) {
      data.toggle();
    }
    else {
      $canvas.offcanvas(option);
    }
  })

}(window.jQuery);
