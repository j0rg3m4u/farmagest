"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_ROLE_LABELS = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["COORDINATION"] = "COORDINATION";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["ASSISTANT"] = "ASSISTANT";
    UserRole["UNIT"] = "UNIT";
    UserRole["MANAGER"] = "MANAGER";
})(UserRole || (exports.UserRole = UserRole = {}));
exports.USER_ROLE_LABELS = {
    [UserRole.COORDINATION]: 'Coordenação',
    [UserRole.ADMIN]: 'Administrativo',
    [UserRole.ASSISTANT]: 'Auxiliar',
    [UserRole.UNIT]: 'Unidade',
    [UserRole.MANAGER]: 'Gestor',
};
