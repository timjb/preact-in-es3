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
      searchString: '',
      isVisible: false,
      expanded: {},
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

  show: function() {
    this.setState({ isVisible: true });
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

    this.setState({ searchString: searchString, isVisible: true, moduleResults: moduleResults });
  },

  onKeydown: function(e) {
    if (e.key == 'Escape') {
      this.hide();
    }
  },

  render: function(props, state) {
    var self = this;
    var items = take(10, state.moduleResults).map(function(resultsInModule) {
      return self.renderResultsInModule(resultsInModule);
    });
    var stopPropagation = function(e) { e.stopPropagation(); };
    return (
      h('div', { id: 'search', onMouseDown: stopPropagation },
        h('div', { id: 'search-form' },
          h('input', {
            placeholder: "Search in package by name",
            onFocus: this.show.bind(this),
            onClick: this.show.bind(this),
            onKeydown: this.onKeydown.bind(this),
            onInput: function(e) {
              self.updateResults(e.target.value);
            }
          }),
        ),
        !state.isVisible
          ? null
          : h('div', { id: 'search-results' },
              state.searchString === ''
                ? h(IntroMsg)
                :    items.length == 0
                      ? h(NoResultsMsg, { searchString: state.searchString })
                      : h('ul', null, items)
            )
      )
    );
  },

  renderResultsInModule: function(resultsInModule) {
    var items = resultsInModule.items;
    var moduleName = resultsInModule.module;
    var showAll = this.state.expanded[moduleName] || items.length <= 10;
    var visibleItems = showAll ? items : take(8, items);

    var expand = function() {
      var newExpanded = Object.assign({}, this.state.expanded);
      newExpanded[moduleName] = true;
      this.setState({ expanded: newExpanded });
    }.bind(this);

    return h('li', { class: 'search-module' },
      h('p', null, moduleName),
      h('ul', null,
        visibleItems.map(function(item) { return h(Item, item.item); }),
        showAll
          ? null
          : h('li', { class: 'more-results', onClick: expand },
              h('a', { href: '#' }, "(show " + (items.length - visibleItems.length) + " more results from this module)")
            )
      ),
    )
  }

});

var IntroMsg = function() {
  return h('p', null,
    "You can find any type, constructor, class, function or pattern defined in this package by (approximate) name."
  );
};

var NoResultsMsg = function(props) {
  var messages = [
    h('p', null,
      "Your search for '" + props.searchString + "' produced the following list of results: ",
      h('code', null, '[]'),
      "."
    ),
    h('p', null,
      h('code', null, 'Nothing'),
      " matches your query for '" + props.searchString + "'.",
    ),
    h('p', null,
      h('code', null, 'Left "no matches for \'' + props.searchString + '\'" :: Either String (NonEmpty SearchResult)'),
    )
  ];

  return messages[(props.searchString || 'a').charCodeAt(0) % messages.length];
};

var Item = function(props) {
  return (
    h('li', { class: 'search-result' },
      h('a', { href: '#TODO' },
        h('div', null, h('b', null, props.name)),
        h('div', {dangerouslySetInnerHTML: {__html: props.display_html}})
      )
    )
  );
};

preact.render(h(App), document.body);
