'use strict';

function MockAttachment(type, uri, size) {
  this.type = type;
  this.uri = uri;
  this.size = size;
}

MockAttachment.prototype = {
  render: function() {
    var el = document.createElement('iframe');
    el.setAttribute('sandbox', '');
    var src = "data:text/html,";
    src += Utils.Template("attachment-tmpl").interpolate({
      uri: this.ui,
      size: "15 kB"
    });
    el.src = src;
    el.className = 'attachment';
    return el;
  }
};