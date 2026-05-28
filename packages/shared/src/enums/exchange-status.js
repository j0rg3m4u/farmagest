"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXCHANGE_STATUS_LABELS = exports.ExchangeStatus = void 0;
var ExchangeStatus;
(function (ExchangeStatus) {
    ExchangeStatus["DRAFT"] = "DRAFT";
    ExchangeStatus["PENDING"] = "PENDING";
    ExchangeStatus["APPROVED"] = "APPROVED";
    ExchangeStatus["REJECTED"] = "REJECTED";
    ExchangeStatus["READY"] = "READY";
    ExchangeStatus["EXECUTED"] = "EXECUTED";
    ExchangeStatus["COMPLETED"] = "COMPLETED";
    ExchangeStatus["CANCELLED"] = "CANCELLED";
})(ExchangeStatus || (exports.ExchangeStatus = ExchangeStatus = {}));
exports.EXCHANGE_STATUS_LABELS = {
    [ExchangeStatus.DRAFT]: 'Rascunho',
    [ExchangeStatus.PENDING]: 'Aguardando aprovação',
    [ExchangeStatus.APPROVED]: 'Aprovada',
    [ExchangeStatus.REJECTED]: 'Rejeitada',
    [ExchangeStatus.READY]: 'Pronta para executar',
    [ExchangeStatus.EXECUTED]: 'Executada parcialmente',
    [ExchangeStatus.COMPLETED]: 'Concluída',
    [ExchangeStatus.CANCELLED]: 'Cancelada',
};
