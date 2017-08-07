// alias preact's hyperscript reviver since it's referenced a lot:
var h = preact.h;

function createClass(obj) {
  // sub-class Component:
  function F(){ preact.Component.call(this); }
  var p = F.prototype = new preact.Component;
  // copy our skeleton into the prototype:
  for (var i in obj) {
    if (i === 'getDefaultProps' && typeof obj.getDefaultProps === 'function') {
      F.defaultProps = obj.getDefaultProps() || {};
    } else {
      p[i] = obj[i];
    }
  }
  // restore constructor:
  return p.constructor = F;
}

function loadJSON(path, success, error)
{
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function()
  {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        if (success)
          success(JSON.parse(xhr.responseText));
      } else {
        if (error)
          error(xhr);
      }
    }
  };
  xhr.open("GET", path, true);
  xhr.send();
}

// -------------------------------------------------------------------------- //

var App = createClass({
  componentWillMount: function() {
    var self = this;
    self.setState({
      result: []
    });
    loadJSON("doc-index.json", function(data) {
      self.setState({
        fuse: new Fuse(data, {
          threshold: 0.4,
          caseSensitive: true,
          keys: ["name"]
        }),
        result: []
      });
    }, function (err) {
      self.setState({
        result: []
      });
    });
  },
  render: function(props, state) {
    var self = this;
    var items = state.result.map(function(item) {
      return h(Item, item);
    });
    return (
      h('div', { id: 'search' },
        h('div', { id: 'search-form' },
          h('input', {
            placeholder: "Search by name",
            onInput: function(e) {
              self.setState({
                result: state.fuse.search(e.target.value)
              });
            }
          }),
        ),
        h('div', { id: 'search-results' },
          h('ul', null,
            items
          )
        )
      )
    );
  }
});

var Item = function(props) {
  return (
    h('li', null,
      h('div', null, h('b', null, props.name)),
      h('div', {dangerouslySetInnerHTML: {__html: props.display_html}})
    )
  );
}

preact.render(h(App), document.body);
