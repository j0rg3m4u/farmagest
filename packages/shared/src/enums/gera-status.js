"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GERA_TYPE_LABELS = exports.GeraType = exports.GERA_ITEM_STATUS_LABELS = exports.GeraItemStatus = exports.GERA_STATUS_LABELS = exports.GeraStatus = void 0;
var GeraStatus;
(function (GeraStatus) {
    GeraStatus["RECEIVED"] = "RECEIVED";
    GeraStatus["TRIAGING"] = "TRIAGING";
    GeraStatus["COMPLETED"] = "COMPLETED";
    GeraStatus["DISPATCHED"] = "DISPATCHED";
    GeraStatus["CANCELLED"] = "CANCELLED";
})(GeraStatus || (exports.GeraStatus = GeraStatus = {}));
exports.GERA_STATUS_LABELS = {
    [GeraStatus.RECEIVED]: 'Recebido',
    [GeraStatus.TRIAGING]: 'Em triagem',
    [GeraStatus.COMPLETED]: 'Triagem concluída',
    [GeraStatus.DISPATCHED]: 'Despachado',
    [GeraStatus.CANCELLED]: 'Cancelado',
};
var GeraItemStatus;
(function (GeraItemStatus) {
    GeraItemStatus["PENDING"] = "PENDING";
    GeraItemStatus["APPROVED"] = "APPROVED";
    GeraItemStatus["DENIED"] = "DENIED";
})(GeraItemStatus || (exports.GeraItemStatus = GeraItemStatus = {}));
exports.GERA_ITEM_STATUS_LABELS = {
    [GeraItemStatus.PENDING]: 'Pendente',
    [GeraItemStatus.APPROVED]: 'Atendido',
    [GeraItemStatus.DENIED]: 'Negado',
};
var GeraType;
(function (GeraType) {
    GeraType["MONTHLY"] = "MONTHLY";
    GeraType["EXTRAORDINARY"] = "EXTRAORDINARY";
    GeraType["URGENT"] = "URGENT";
})(GeraType || (exports.GeraType = GeraType = {}));
exports.GERA_TYPE_LABELS = {
    [GeraType.MONTHLY]: 'Mensal',
    [GeraType.EXTRAORDINARY]: 'Extraordinário',
    [GeraType.URGENT]: 'Urgente',
};
