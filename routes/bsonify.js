// Basically ripped from https://github.com/douglascrockford/JSON-js/blob/master/json2.js but added BSON support

'use strict';

var mongodb = require('mongodb');

function f(n) {
    // Format integers to have at least two digits.
    return n < 10 ? '0' + n : n;
}

// JSHint warning suppression
var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
var gap;
var indent;
var meta = {    // table of character substitutions
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '"': '\\"',
    '\\': '\\\\',
};
var rep;

function quote(string) {
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
        var c = meta[a];
        return typeof c === 'string' ?
            c :
            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"' : '"' + string + '"';
}

function str(key, holder) {
    var i;          // The loop counter.
    var k;          // The member key.
    var v;          // The member value.
    var length;
    var mind = gap;
    var partial;
    var value = holder[key];

    if (value instanceof mongodb.ObjectID) {
        return 'ObjectId("' + value + '")';
    } else if (value instanceof mongodb.Timestamp) {
        return 'Timestamp(' + value.high_ + ', ' + value.low_ + ')';
    } else if (value instanceof Date) {
        return 'ISODate("' + value.toJSON() + '")';
    } else if (value instanceof mongodb.DBRef) {
        if (value.db === '') {
            return 'DBRef("' + value.namespace + '", "' + value.oid + '")';
        } else {
            return 'DBRef("' + value.namespace + '", "' + value.oid + '", "' + value.db + '")';
        }
    } else if (value instanceof mongodb.Code) {
        return 'Code("' + value.code + '")';
    } else if (value instanceof mongodb.MinKey) {
        return 'MinKey()';
    } else if (value instanceof mongodb.MaxKey) {
        return 'MaxKey()';
    } else if (value instanceof mongodb.Symbol) {
        return 'Symbol("' + value + '")';
    }

    if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
        value = value.toJSON(key);
    }

    if (typeof rep === 'function') {
        value = rep.call(holder, key, value);
    }

    switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':
            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':
            return String(value);
        case 'object':
            if (!value) {
                return 'null';
            }
            gap += indent;
            partial = [];
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }
                v = partial.length === 0 ?
                    '[]' :
                    gap ?
                        '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                        '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }
            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            v = partial.length === 0 ?
                '{}' :
                gap ?
                    '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                    '{' + partial.join(',') + '}';
            gap = mind;
            return v;
    }
}

exports.stringify = function (value, replacer, space) {
    var i;
    gap = '';
    indent = '';
    if (typeof space === 'number') {
        for (i = 0; i < space; i += 1) {
            indent += ' ';
        }
    } else if (typeof space === 'string') {
        indent = space;
    }

    rep = replacer;
    if (replacer && typeof replacer !== 'function' &&
        (typeof replacer !== 'object' ||
            typeof replacer.length !== 'number')) {
        throw new Error('JSON.stringify');
    }
    return str('', { '': value });
};