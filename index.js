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

function loadJSON(path, success, error) {
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

function take(n, arr) {
  if (arr.length <= n) { return arr; }
  return arr.slice(0, n);
}

var App = createClass({
  componentWillMount: function() {
    var self = this;
    self.setState({
      isVisible: false,
      moduleResults: []
    });
    loadJSON("doc-index.json", function(data) {
      self.setState({
        fuse: new Fuse(data, {
          threshold: 0.4,
          caseSensitive: true,
          includeScore: true,
          keys: ["name"]
        }),
        moduleResults: []
      });
    }, function (err) {
      if (console) {
        console.error("could not load 'doc-index.json' for searching", err);
      }
      self.setState({
        moduleResults: []
      });
    });

    document.addEventListener('mousedown', this.hide.bind(this));
  },

  hide: function() {
    this.setState({ isVisible: false });
  },

  updateResults: function(searchString) {
    var results = this.state.fuse.search(searchString)

    var resultsByModule = {};

    results.forEach(function(result) {
      var moduleName = result.item.module;
      var resultsInModule = resultsByModule[moduleName] || (resultsByModule[moduleName] = []);
      resultsInModule.push(result);
    });

    var moduleResults = [];
    for (var moduleName in resultsByModule) {
      var items = resultsByModule[moduleName];
      var sumOfInverseScores = 0;
      items.forEach(function(item) { sumOfInverseScores += 1/item.score; });
      moduleResults.push({ module: moduleName, totalScore: 1/sumOfInverseScores, items: items });
    }

    moduleResults.sort(function(a, b) { return a.totalScore - b.totalScore; });

    this.setState({ isVisible: true, moduleResults: moduleResults });
  },

  onKeydown: function(e) {
    if (e.key == 'Escape') {
      this.setState({ isVisible: false });
    }
  },

  render: function(props, state) {
    var self = this;
    var items = take(10, state.moduleResults).map(function(resultsInModule) {
      return h(ResultsInModule, resultsInModule);
    });
    var stopPropagation = function(e) { e.stopPropagation(); };
    return (
      h('div', { id: 'search', onMouseDown: stopPropagation },
        h('div', { id: 'search-form' },
          h('input', {
            placeholder: "Search in package by name",
            onFocus: function(e) {
              self.setState({ isVisible: true });
            },
            onKeydown: this.onKeydown.bind(this),
            onInput: function(e) {
              self.updateResults(e.target.value);
            }
          }),
        ),
        state.isVisible ?
          h('div', { id: 'search-results' },
            h('ul', null,
              items
            )
          ) : null
      )
    );
  }
});

var ResultsInModule = function(props) {
  return h('li', null,
    h('p', null, props.module),
    h('ul', null,
      take(8, props.items).map(function(item) { return h(Item, item.item); })
    ),
    props.items.length > 8 ?
      h('p', null, "(more results on module page)") : null
  )
};

var Item = function(props) {
  return (
    h('li', null,
      h('div', null, h('b', null, props.name)),
      h('div', {dangerouslySetInnerHTML: {__html: props.display_html}})
    )
  );
};

preact.render(h(App), document.body);
