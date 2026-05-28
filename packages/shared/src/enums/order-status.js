"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORDER_STATUS_LABELS = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["DRAFT"] = "DRAFT";
    OrderStatus["TRIAGE"] = "TRIAGE";
    OrderStatus["SEPARATION"] = "SEPARATION";
    OrderStatus["FULFILLED"] = "FULFILLED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
exports.ORDER_STATUS_LABELS = {
    [OrderStatus.DRAFT]: 'Rascunho',
    [OrderStatus.TRIAGE]: 'Em triagem',
    [OrderStatus.SEPARATION]: 'Em separação',
    [OrderStatus.FULFILLED]: 'Atendido',
    [OrderStatus.CANCELLED]: 'Cancelado',
};
