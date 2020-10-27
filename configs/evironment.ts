const NODE_ENV = process.env.NODE_ENV || 'dev';

export function isProduction() {
    return NODE_ENV === 'prod';
}
