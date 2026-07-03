import { getById } from '../db/mysql';
export var AccessLevel;
(function (AccessLevel) {
    AccessLevel["NONE"] = "none";
    AccessLevel["DASHBOARD"] = "dashboard";
    AccessLevel["READ"] = "read";
    AccessLevel["CRUD"] = "crud";
})(AccessLevel || (AccessLevel = {}));
export var Module;
(function (Module) {
    Module["COMPANYPROFILE"] = "companyprofile";
    Module["STUDENTS"] = "students";
    Module["KUNJUNGAN"] = "kunjungan";
    Module["PPDB"] = "ppdb";
})(Module || (Module = {}));
const LEVEL_ORDER = [AccessLevel.NONE, AccessLevel.DASHBOARD, AccessLevel.READ, AccessLevel.CRUD];
export const DEFAULT_PERMISSIONS = {
    [Module.COMPANYPROFILE]: AccessLevel.NONE,
    [Module.STUDENTS]: AccessLevel.NONE,
    [Module.KUNJUNGAN]: AccessLevel.NONE,
    [Module.PPDB]: AccessLevel.NONE,
};
export async function hasModuleAccess(user, module, required = AccessLevel.DASHBOARD) {
    if (user.user_type === 'superadmin')
        return true;
    const profile = user.profile || {};
    const overrides = profile.permissions_override || {};
    if (module in overrides) {
        const idx = LEVEL_ORDER.indexOf(overrides[module]);
        if (idx >= LEVEL_ORDER.indexOf(required))
            return true;
    }
    const roleId = user.role_id;
    if (!roleId)
        return false;
    const role = await getById('roles', roleId);
    if (!role)
        return false;
    if (role.is_superadmin)
        return true;
    const permissions = role.permissions || {};
    const levelStr = permissions[module] || AccessLevel.NONE;
    const level = LEVEL_ORDER.indexOf(levelStr);
    return level >= LEVEL_ORDER.indexOf(required);
}
