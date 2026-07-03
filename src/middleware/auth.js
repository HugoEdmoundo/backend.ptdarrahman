import { HTTPException } from 'hono/http-exception';
import { verifyToken } from '../auth/auth';
import { getById } from '../db/mysql';
export async function getCurrentUser(c, next) {
    const auth = c.req.header('Authorization');
    if (!auth?.startsWith('Bearer ')) {
        throw new HTTPException(401, { message: 'Missing or invalid token' });
    }
    const token = auth.slice(7);
    const payload = await verifyToken(token);
    if (!payload) {
        throw new HTTPException(401, { message: 'Invalid or expired token' });
    }
    const userId = payload.sub;
    if (!userId) {
        throw new HTTPException(401, { message: 'Invalid token payload' });
    }
    const user = await getById('users', userId);
    if (!user) {
        throw new HTTPException(401, { message: 'User not found' });
    }
    if (user.is_active === false) {
        throw new HTTPException(403, { message: 'User is inactive' });
    }
    c.set('user', user);
    await next();
}
export async function requireSuperadmin(c, next) {
    const user = c.get('user');
    if (user.user_type === 'superadmin') {
        await next();
        return;
    }
    const roleId = user.role_id;
    if (roleId) {
        const role = await getById('roles', roleId);
        if (role?.is_superadmin) {
            await next();
            return;
        }
    }
    throw new HTTPException(403, { message: 'Superadmin access required' });
}
