(function(){d3.behavior = {};
// TODO unbind zoom behavior?
// TODO unbind listener?
d3.behavior.zoom = function() {

  var x = 0,
      y = 0,
      w = 0,
      z = 0,
      oldx = 0,
      oldy = 0,
      oldw = 0,
      oldz = 0,
      listeners = [],
      pan,
      zoom;

  function zoom() {
    var container = this
        .on("mousedown", mousedown)
        .on("mousewheel", mousewheel)
        .on("DOMMouseScroll", mousewheel)
        .on("dblclick", mousewheel);

    d3.select(window)
        .on("mousemove", mousemove)
        .on("mouseup", mouseup);
  }

  function mousedown(d, i) {
    pan = {
      x0: x - d3.event.clientX,
      y0: y - d3.event.clientY,
      xe: d3.event.clientX,
      ye: d3.event.clientY,
      target: this,
      data: d,
      index: i
    };
    d3.event.preventDefault();
    window.focus(); // TODO focusableParent
  }

  function mousemove() {
    zoom = null;
    if (pan) {
      oldx = x;
      oldy = y;
      x = d3.event.clientX + pan.x0;
      y = d3.event.clientY + pan.y0;
      dispatch.call(pan.target, pan.data, pan.index);
    }
  }

  function mouseup() {
    if (pan) {
      mousemove();
      pan = null;
    }
  }

  // mousewheel events are totally broken!
  // https://bugs.webkit.org/show_bug.cgi?id=40441
  // not only that, but Chrome and Safari differ in re. to acceleration!

  var outer = d3.select("body").append("div")
      .style("visibility", "hidden")
      .style("position", "absolute")
      .style("top", "-3000px")
      .style("height", 0)
      .style("overflow-y", "scroll")
    .append("div")
      .style("height", "2000px")
    .node().parentNode;

  function mousewheel(d, i) {
    var e = d3.event;

    // initialize the mouse location for zooming (to avoid drift)
    if (!zoom) {
      var p = d3.svg.mouse(this.nearestViewportElement || this);
      zoom = {
        x0: x,
        y0: y,
        w0: w,
        z0: z,
        xe: p[0],
        ye: p[1],
        x1: x - p[0],
        y1: y - p[1]
      };
    }

    // adjust zoom level
    oldw = w;
    oldz = z;
    if (e.type === "dblclick") {
      w = e.shiftKey ? Math.ceil(w - 1) : Math.floor(w + 1);
      z = e.shiftKey ? Math.ceil(z - 1) : Math.floor(z + 1);
    } else {
      var delta = e.wheelDelta || -e.detail;
      if (delta) {
        try {
          outer.scrollTop = 1000;
          outer.dispatchEvent(e);
          delta = 1000 - outer.scrollTop;
        } catch (error) {
          // Derp! Hope for the best?
        }
        delta *= .005;
      }
      w += delta;
      z += delta;
    }

    // adjust x and y to center around mouse location
    var k = Math.pow(2, z - zoom.z0) - 1;
    oldx = x;
    oldy = y;
    x = zoom.x0 + zoom.x1 * k;
    y = zoom.y0 + zoom.y1 * k;


    // dispatch redraw
    dispatch.call(this, d, i);
    zoom = null;
    pan = null;
  }

  function dispatch(d, i) {
    var o = d3.event, // Events can be reentrant (e.g., focus).
        kx = Math.pow(2, w),
        ky = Math.pow(2, z),
        revertx = false,
        reverty = false;

    d3.event = {
      scale: kx,
      scaley: ky,
      translate: [x, y],
      fulcrum: ( zoom ? [zoom.xe, zoom.ye] : [pan.xe, pan.ye] ),
      transform: function(sx, sy) {
        if (sx) transform(sx, x, kx); else revertx = true;
        if (sy) transform(sy, y, ky); else reverty = true;
      }
    };

    function transform(scale, o, factor) {
      var domain = scale.__domain || (scale.__domain = scale.domain()),
          range = scale.range().map(function(v) { return (v - o) / ( arguments.length > 2 ? factor : kx ); });
      scale.domain(domain).domain(range.map(scale.invert));
    }

    try {
      for (var j = 0, m = listeners.length; j < m; j++) {
        listeners[j].call(this, d, i);
      }
    } finally {
      if ( revertx ) {
        x = oldx;
        w = oldw;
        revertx = false;
      }
      if ( reverty ) {
        y = oldy;
        z = oldz;
        reverty = false;
      }
      d3.event = o;
    }
  }

  zoom.on = function(type, listener) {
    if (type == "zoom") listeners.push(listener);
    return zoom;
  };

  return zoom;
};
})()
