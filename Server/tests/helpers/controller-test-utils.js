const path = require("node:path");

const createSpy = (implementation = () => undefined) => {
  const spy = (...args) => {
    spy.calls.push(args);
    return implementation(...args);
  };

  spy.calls = [];
  return spy;
};

const createQuery = (result) => {
  const query = {
    populate() {
      return query;
    },
    select() {
      return query;
    },
    sort() {
      return query;
    },
    skip() {
      return query;
    },
    limit() {
      return query;
    },
    lean() {
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
    catch(reject) {
      return Promise.resolve(result).catch(reject);
    },
    finally(callback) {
      return Promise.resolve(result).finally(callback);
    },
  };

  return query;
};

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const loadModuleWithMocks = (targetPath, mocks) => {
  const resolvedTarget = path.resolve(targetPath);
  const originalTarget = require.cache[resolvedTarget];
  const originals = [];

  for (const [request, exports] of Object.entries(mocks)) {
    const resolvedRequest = require.resolve(request, {
      paths: [path.dirname(resolvedTarget)],
    });

    originals.push([resolvedRequest, require.cache[resolvedRequest]]);
    require.cache[resolvedRequest] = {
      id: resolvedRequest,
      filename: resolvedRequest,
      loaded: true,
      exports,
    };
  }

  delete require.cache[resolvedTarget];
  const loaded = require(resolvedTarget);

  const restore = () => {
    delete require.cache[resolvedTarget];

    if (originalTarget) {
      require.cache[resolvedTarget] = originalTarget;
    }

    for (const [resolvedRequest, original] of originals.reverse()) {
      if (original) {
        require.cache[resolvedRequest] = original;
      } else {
        delete require.cache[resolvedRequest];
      }
    }
  };

  return { loaded, restore };
};

module.exports = {
  createQuery,
  createResponse,
  createSpy,
  loadModuleWithMocks,
};
