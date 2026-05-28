"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExitType = exports.isEntryType = exports.MOVEMENT_TYPE_LABELS = exports.MovementType = void 0;
var MovementType;
(function (MovementType) {
    MovementType["ENTRY_PURCHASE"] = "ENTRY_PURCHASE";
    MovementType["ENTRY_EXCHANGE"] = "ENTRY_EXCHANGE";
    MovementType["ENTRY_ADJUSTMENT"] = "ENTRY_ADJUSTMENT";
    MovementType["ENTRY_RETURN"] = "ENTRY_RETURN";
    MovementType["EXIT_SUPPLY"] = "EXIT_SUPPLY";
    MovementType["EXIT_EXCHANGE"] = "EXIT_EXCHANGE";
    MovementType["EXIT_ADJUSTMENT"] = "EXIT_ADJUSTMENT";
    MovementType["EXIT_DISPOSAL"] = "EXIT_DISPOSAL";
})(MovementType || (exports.MovementType = MovementType = {}));
exports.MOVEMENT_TYPE_LABELS = {
    [MovementType.ENTRY_PURCHASE]: 'Entrada — Compra',
    [MovementType.ENTRY_EXCHANGE]: 'Entrada — Troca',
    [MovementType.ENTRY_ADJUSTMENT]: 'Entrada — Ajuste',
    [MovementType.ENTRY_RETURN]: 'Entrada — Devolução',
    [MovementType.EXIT_SUPPLY]: 'Saída — Abastecimento',
    [MovementType.EXIT_EXCHANGE]: 'Saída — Troca',
    [MovementType.EXIT_ADJUSTMENT]: 'Saída — Ajuste',
    [MovementType.EXIT_DISPOSAL]: 'Saída — Descarte',
};
const isEntryType = (type) => type.startsWith('ENTRY_');
exports.isEntryType = isEntryType;
const isExitType = (type) => type.startsWith('EXIT_');
exports.isExitType = isExitType;
