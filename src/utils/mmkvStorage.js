import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

/**
 * ✅ String Store
 */
export const setString = (key, value) => {
  try {
    storage.set(key, value);
  } catch (e) {
    console.error('MMKV setString error:', e);
  }
};

export const getString = (key) => {
  try {
    return storage.getString(key) || null;
  } catch (e) {
    console.error('MMKV getString error:', e);
    return null;
  }
};

/**
 * ✅ Object Store
 */
export const setObject = (key, obj) => {
  try {
    storage.set(key, JSON.stringify(obj));
  } catch (e) {
    console.error('MMKV setObject error:', e);
  }
};

export const getObject = (key) => {
  try {
    const json = storage.getString(key);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error('MMKV getObject error:', e);
    return null;
  }
};

/**
 * ✅ Array Store
 */
export const setArray = (key, arr) => {
  try {
    storage.set(key, JSON.stringify(arr));
  } catch (e) {
    console.error('MMKV setArray error:', e);
  }
};

export const getArray = (key) => {
  try {
    const json = storage.getString(key);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('MMKV getArray error:', e);
    return [];
  }
};

/**
 * ✅ Delete & Clear
 */
export const removeItem = (key) => {
  try {
    storage.delete(key);
  } catch (e) {
    console.error('MMKV removeItem error:', e);
  }
};

export const clearAll = () => {
  try {
    storage.clearAll();
  } catch (e) {
    console.error('MMKV clearAll error:', e);
  }
};
