"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIT_TYPE_LABELS = exports.UnitType = void 0;
var UnitType;
(function (UnitType) {
    UnitType["UBS"] = "UBS";
    UnitType["UPA"] = "UPA";
    UnitType["HOSPITAL"] = "HOSPITAL";
    UnitType["CAPS"] = "CAPS";
    UnitType["OTHER"] = "OTHER";
})(UnitType || (exports.UnitType = UnitType = {}));
exports.UNIT_TYPE_LABELS = {
    [UnitType.UBS]: 'UBS',
    [UnitType.UPA]: 'UPA',
    [UnitType.HOSPITAL]: 'Hospital',
    [UnitType.CAPS]: 'CAPS',
    [UnitType.OTHER]: 'Outra',
};
