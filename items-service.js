"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.multiplyBqt = undefined;

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _assign = require("babel-runtime/core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _extends2 = require("babel-runtime/helpers/extends");

var _extends3 = _interopRequireDefault(_extends2);

var _mongoQueriesBlueforest = require("mongo-queries-blueforest");

var _lodash = require("lodash");

var _fraction = require("fraction.js");

var _fraction2 = _interopRequireDefault(_fraction);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var multiplyBqt = exports.multiplyBqt = function multiplyBqt(tree, coef) {
    if (coef) {
        tree.items = (0, _lodash.map)(tree.items, function (item) {
            return item.quantity ? (0, _extends3.default)({}, item, { quantity: { bqt: (0, _fraction2.default)(item.quantity.bqt).mul(coef).valueOf() } }) : (0, _lodash.omit)(item, "quantity");
        });
    } else {
        tree.items = (0, _lodash.map)(tree, function (item) {
            return (0, _lodash.omit)(item, "quantity");
        });
    }
    return tree;
};

var configure = function configure(col) {

    var get = function get(_ref) {
        var _id = _ref._id;
        return col().findOne((0, _mongoQueriesBlueforest.withId)(_id)).then(function (i) {
            return i || { _id: _id, items: [] };
        });
    };

    var appendItemsInfos = function appendItemsInfos(mixin) {
        return function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(item) {
                var items, infos, i, _item, j, info;

                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                items = item.items;
                                _context.next = 3;
                                return col().find((0, _mongoQueriesBlueforest.withIdIn)((0, _lodash.map)(items, "_id")), mixin).toArray();

                            case 3:
                                infos = _context.sent;


                                for (i = 0; i < items.length; i++) {
                                    _item = items[i];

                                    for (j = 0; j < infos.length; j++) {
                                        info = infos[j];

                                        if (_item._id.equals(info._id)) {
                                            (0, _assign2.default)(_item, info);
                                        }
                                    }
                                }
                                return _context.abrupt("return", item);

                            case 6:
                            case "end":
                                return _context.stop();
                        }
                    }
                }, _callee, undefined);
            }));

            return function (_x) {
                return _ref2.apply(this, arguments);
            };
        }();
    };

    var graphLookup = function graphLookup(collectionName) {
        return {
            $graphLookup: {
                from: collectionName,
                startWith: "$items._id",
                connectFromField: "items._id",
                connectToField: "_id",
                maxDepth: 10,
                as: "cache"
            }
        };
    };

    var initReadTree = function initReadTree(collectionName) {
        return function (_ref3) {
            var _id = _ref3._id;
            return getGraph(_id, graphLookup(collectionName)).then(treefy).then(function (tree) {
                return tree || (0, _extends3.default)({}, (0, _mongoQueriesBlueforest.withIdBqt)(_id, 1), { items: [] });
            });
        };
    };

    var getGraph = function getGraph(_id, lookup) {
        return col().aggregate([(0, _mongoQueriesBlueforest.matchId)(_id), lookup]).next();
    };

    var treefy = function treefy(graph) {
        if (!graph) return null;

        var cache = graph.cache;
        var tree = (0, _lodash.omit)(graph, "cache");

        tree.items = loadFromCache(tree, cache);
        tree.quantity = { bqt: 1 };

        return tree;
    };

    var loadFromCache = function loadFromCache(tree, cache) {
        var items = [];
        (0, _lodash.forEach)(tree.items, function (item) {
            item.items = [];
            var cachedItem = (0, _lodash.cloneDeep)((0, _lodash.find)(cache, { _id: item._id }));
            if (cachedItem) {
                multiplyBqt(cachedItem, item.quantity && item.quantity.bqt);
                cachedItem.quantity = item.quantity;
                cachedItem.items = loadFromCache(cachedItem, cache);
                items.push(cachedItem);
            } else {
                items.push((0, _lodash.omit)(item, "items"));
            }
        });
        return items;
    };

    var deleteItems = function deleteItems(trunkId, itemsIds) {
        return col().update((0, _mongoQueriesBlueforest.withId)(trunkId), (0, _mongoQueriesBlueforest.pullItems)(itemsIds));
    };
    var removeItem = function removeItem(leftId, rightId) {
        return col().update((0, _mongoQueriesBlueforest.withId)(leftId), (0, _mongoQueriesBlueforest.pullItem)(rightId));
    };

    var insertItem = function insertItem(left, right) {
        return removeItem(left._id, right._id).then(function () {
            return addItem(left._id, right);
        });
    };

    var addItem = function () {
        var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(id, item) {
            return _regenerator2.default.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            return _context2.abrupt("return", col().update((0, _mongoQueriesBlueforest.withId)(id), (0, _mongoQueriesBlueforest.pushItem)(item), _mongoQueriesBlueforest.upsert));

                        case 1:
                        case "end":
                            return _context2.stop();
                    }
                }
            }, _callee2, undefined);
        }));

        return function addItem(_x2, _x3) {
            return _ref4.apply(this, arguments);
        };
    }();

    var upsertItem = function () {
        var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(left, right) {
            return _regenerator2.default.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            return _context3.abrupt("return", removeItem(left._id, right._id).then(function () {
                                return adaptBqt(left, right);
                            }).then(function (bqt) {
                                return addItem(left._id, (0, _extends3.default)({}, right, { quantity: { bqt: bqt } }));
                            }));

                        case 1:
                        case "end":
                            return _context3.stop();
                    }
                }
            }, _callee3, undefined);
        }));

        return function upsertItem(_x4, _x5) {
            return _ref5.apply(this, arguments);
        };
    }();

    var adaptBqt = function () {
        var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(left, right) {
            return _regenerator2.default.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            _context4.next = 2;
                            return getSertBqt(left);

                        case 2:
                            _context4.t0 = _context4.sent.quantity.bqt;
                            _context4.t1 = left.quantity.bqt;
                            _context4.t2 = _context4.t0 / _context4.t1;
                            _context4.t3 = right.quantity.bqt;
                            return _context4.abrupt("return", _context4.t2 * _context4.t3);

                        case 7:
                        case "end":
                            return _context4.stop();
                    }
                }
            }, _callee4, undefined);
        }));

        return function adaptBqt(_x6, _x7) {
            return _ref6.apply(this, arguments);
        };
    }();

    var getSertBqt = function () {
        var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(trunk) {
            var dbTrunk;
            return _regenerator2.default.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            console.log("GET SERT", trunk);
                            _context5.next = 3;
                            return readBqt(trunk._id);

                        case 3:
                            dbTrunk = _context5.sent;

                            console.log("GET SERT DB TRUNK", dbTrunk);

                            if (!(!dbTrunk || !dbTrunk.quantity)) {
                                _context5.next = 10;
                                break;
                            }

                            _context5.next = 8;
                            return setBqt(trunk);

                        case 8:
                            console.log("GET SERT INSERTED", trunk);
                            dbTrunk = trunk;

                        case 10:
                            return _context5.abrupt("return", dbTrunk);

                        case 11:
                        case "end":
                            return _context5.stop();
                    }
                }
            }, _callee5, undefined);
        }));

        return function getSertBqt(_x8) {
            return _ref7.apply(this, arguments);
        };
    }();

    var readBqt = function () {
        var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(id) {
            return _regenerator2.default.wrap(function _callee6$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            return _context6.abrupt("return", col().findOne((0, _mongoQueriesBlueforest.withId)(id), _mongoQueriesBlueforest.quantityField));

                        case 1:
                        case "end":
                            return _context6.stop();
                    }
                }
            }, _callee6, undefined);
        }));

        return function readBqt(_x9) {
            return _ref8.apply(this, arguments);
        };
    }();

    var readAllQuantified = function () {
        var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(items) {
            return _regenerator2.default.wrap(function _callee7$(_context7) {
                while (1) {
                    switch (_context7.prev = _context7.next) {
                        case 0:
                            return _context7.abrupt("return", _promise2.default.all((0, _lodash.map)(items, function (item) {
                                return item.quantity ? get(item).then(function (i) {
                                    return multiplyBqt(i, item.quantity && item.quantity.bqt);
                                }) : (0, _mongoQueriesBlueforest.withId)(item._id);
                            })));

                        case 1:
                        case "end":
                            return _context7.stop();
                    }
                }
            }, _callee7, undefined);
        }));

        return function readAllQuantified(_x10) {
            return _ref9.apply(this, arguments);
        };
    }();

    var setBqt = function setBqt(_ref10) {
        var _id = _ref10._id,
            quantity = _ref10.quantity;
        return col().update((0, _mongoQueriesBlueforest.withId)(_id), { $set: { quantity: quantity } }, _mongoQueriesBlueforest.upsert);
    };

    var insertOne = function insertOne(item) {
        return col().insertOne(item);
    };

    var update = function update(item) {
        return col().update((0, _mongoQueriesBlueforest.withId)(item._id), { $set: item });
    };

    var deleteOne = function deleteOne(item) {
        return col().deleteOne(item);
    };

    var withIdsIn = function withIdsIn(_ids) {
        return col().find((0, _mongoQueriesBlueforest.withIdIn)(_ids)).toArray();
    };

    return {
        withIdsIn: withIdsIn,
        deleteOne: deleteOne,
        get: get,
        appendItemsInfos: appendItemsInfos,
        insertItem: insertItem,
        upsertItem: upsertItem,
        removeItem: removeItem,
        deleteItems: deleteItems,
        initReadTree: initReadTree,
        readAllQuantified: readAllQuantified,
        insertOne: insertOne,
        update: update
    };
};

exports.default = configure;