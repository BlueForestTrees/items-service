"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.configureItemService = undefined;

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _treesUnits = require("trees-units");

var _treesQuery = require("trees-query");

var _treesErrors = require("trees-errors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var configure = function configure(db) {

    var insertItem = function insertItem(_ref) {
        var left = _ref.left,
            right = _ref.right;
        return removeItem({ leftId: left._id, rightId: right._id }).then(function () {
            return addItem(left._id, right._id);
        });
    };

    var removeItem = function removeItem(_ref2) {
        var leftId = _ref2.leftId,
            rightId = _ref2.rightId;
        return db().update((0, _treesQuery.withId)(leftId), (0, _treesQuery.pullItem)(rightId));
    };
    var addItem = function () {
        var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(leftId, rightId, quantity) {
            return _regenerator2.default.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            return _context.abrupt("return", db().update((0, _treesQuery.withId)(leftId), (0, _treesQuery.pushItem)({ _id: rightId, quantity: quantity }), _treesQuery.upsert));

                        case 1:
                        case "end":
                            return _context.stop();
                    }
                }
            }, _callee, undefined);
        }));

        return function addItem(_x, _x2, _x3) {
            return _ref3.apply(this, arguments);
        };
    }();

    var upsertItem = function () {
        var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(_ref5) {
            var left = _ref5.left,
                right = _ref5.right;
            return _regenerator2.default.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            return _context2.abrupt("return", removeItem({ leftId: left._id, rightId: right._id }).then(function () {
                                return adaptQtUnit(left, right);
                            }).then(function (quantity) {
                                return addItem(left._id, right._id, quantity);
                            }));

                        case 1:
                        case "end":
                            return _context2.stop();
                    }
                }
            }, _callee2, undefined);
        }));

        return function upsertItem(_x4) {
            return _ref4.apply(this, arguments);
        };
    }();

    var adaptQtUnit = function () {
        var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(left, right) {
            var dbTrunkQt, trunkCoef;
            return _regenerator2.default.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            _context3.next = 2;
                            return getSertQuantity(left);

                        case 2:
                            dbTrunkQt = _context3.sent;
                            trunkCoef = 0;
                            _context3.prev = 4;

                            trunkCoef = (0, _treesUnits.qtUnitCoef)(dbTrunkQt, left.quantity);
                            _context3.next = 12;
                            break;

                        case 8:
                            _context3.prev = 8;
                            _context3.t0 = _context3["catch"](4);

                            if (!(_context3.t0 instanceof _treesErrors.GrandeurMismatchError)) {
                                _context3.next = 12;
                                break;
                            }

                            throw new _treesErrors.UnitInvalidError("unit\xE9 incompatible", _context3.t0);

                        case 12:
                            return _context3.abrupt("return", { qt: trunkCoef * right.quantity.qt, unit: right.quantity.unit });

                        case 13:
                        case "end":
                            return _context3.stop();
                    }
                }
            }, _callee3, undefined, [[4, 8]]);
        }));

        return function adaptQtUnit(_x5, _x6) {
            return _ref6.apply(this, arguments);
        };
    }();

    var getSertQuantity = function () {
        var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(trunk) {
            var trunkQuantity;
            return _regenerator2.default.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            _context4.next = 2;
                            return readForQuantity(trunk._id).then(function (item) {
                                return item && item.quantity || null;
                            });

                        case 2:
                            trunkQuantity = _context4.sent;

                            if (!trunkQuantity) {
                                _context4.next = 7;
                                break;
                            }

                            return _context4.abrupt("return", trunkQuantity);

                        case 7:
                            if (!(trunk.quantity && trunk.quantity.qt && trunk.quantity.unit)) {
                                _context4.next = 13;
                                break;
                            }

                            _context4.next = 10;
                            return setQuantity({ _id: trunk._id, quantity: trunk.quantity });

                        case 10:
                            return _context4.abrupt("return", trunk.quantity);

                        case 13:
                            return _context4.abrupt("return", {});

                        case 14:
                        case "end":
                            return _context4.stop();
                    }
                }
            }, _callee4, undefined);
        }));

        return function getSertQuantity(_x7) {
            return _ref7.apply(this, arguments);
        };
    }();

    var readForQuantity = function () {
        var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(id) {
            return _regenerator2.default.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            return _context5.abrupt("return", db().findOne((0, _treesQuery.withId)(id), _treesQuery.quantityField));

                        case 1:
                        case "end":
                            return _context5.stop();
                    }
                }
            }, _callee5, undefined);
        }));

        return function readForQuantity(_x8) {
            return _ref8.apply(this, arguments);
        };
    }();

    var setQuantity = function setQuantity(_ref9) {
        var _id = _ref9._id,
            quantity = _ref9.quantity;
        return db().update((0, _treesQuery.withId)(_id), { $set: { quantity: quantity } }, _treesQuery.upsert);
    };

    return {
        setQuantity: setQuantity, insertItem: insertItem
    };
};

var configureItemService = exports.configureItemService = configure;