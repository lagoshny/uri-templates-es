export class UriTemplates {

    private static uriTemplateGlobalModifiers = {
        '+': true,
        '#': true,
        '.': true,
        '/': true,
        ';': true,
        '?': true,
        '&': true
    };

    private static uriTemplateSuffices = {
        '*': true
    };

    private readonly textParts: any;

    private readonly substitutions: any;

    private readonly unSubstitutions: any;

    private readonly prefixes: any;

    constructor(private template: string) {
        let parts = template.split('{');
        this.textParts = [parts.shift()];
        this.prefixes = [];
        this.substitutions = [];
        this.unSubstitutions = [];
        let varNames = [];
        while (parts.length > 0) {
            let part = parts.shift();
            let spec = part.split('}')[0];
            let remainder = part.substring(spec.length + 1);
            let funcs = this.uriTemplateSubstitution(spec);
            this.substitutions.push(funcs.substitution);
            this.unSubstitutions.push(funcs.unSubstitution);
            this.prefixes.push(funcs.prefix);
            this.textParts.push(remainder);
            varNames = varNames.concat(funcs.substitution.varNames);
        }
    }

    public fill(valueFunction): string {
        if (valueFunction && typeof valueFunction !== 'function') {
            let value = valueFunction;
            valueFunction = function (varName) {
                return value[varName];
            };
        }

        let result = this.textParts[0];
        for (let i = 0; i < this.substitutions.length; i++) {
            let substitution = this.substitutions[i];
            result += substitution(valueFunction);
            result += this.textParts[i + 1];
        }
        return result;
    }

    public fromUri(substituted) {
        var result = {};
        for (var i = 0; i < this.textParts.length; i++) {
            var part = this.textParts[i];
            if (substituted.substring(0, part.length) !== part) {
                return undefined;
            }
            substituted = substituted.substring(part.length);
            if (i >= this.textParts.length - 1) {
                if (substituted == '') {
                    break;
                } else {
                    return undefined;
                }
            }
            var nextPart = this.textParts[i + 1];
            var offset = i;
            while (true) {
                if (offset == this.textParts.length - 2) {
                    var endPart = substituted.substring(substituted.length - nextPart.length);
                    if (endPart !== nextPart) {
                        return undefined;
                    }
                    var stringValue = substituted.substring(0, substituted.length - nextPart.length);
                    substituted = endPart;
                } else if (nextPart) {
                    var nextPartPos = substituted.indexOf(nextPart);
                    var stringValue = substituted.substring(0, nextPartPos);
                    substituted = substituted.substring(nextPartPos);
                } else if (this.prefixes[offset + 1]) {
                    var nextPartPos = substituted.indexOf(this.prefixes[offset + 1]);
                    if (nextPartPos === -1) nextPartPos = substituted.length;
                    var stringValue = substituted.substring(0, nextPartPos);
                    substituted = substituted.substring(nextPartPos);
                } else if (this.textParts.length > offset + 2) {
                    // If the separator between this variable and the next is blank (with no prefix), continue onwards
                    offset++;
                    nextPart = this.textParts[offset + 1];
                    continue;
                } else {
                    var stringValue = substituted;
                    substituted = '';
                }
                break;
            }
            this.unSubstitutions[i](stringValue, result);
        }
        return result;
    }

    private uriTemplateSubstitution(spec: string): any {
        var modifier = '';
        if (UriTemplates.uriTemplateGlobalModifiers[spec.charAt(0)]) {
            modifier = spec.charAt(0);
            spec = spec.substring(1);
        }
        var separator = '';
        var prefix = '';
        var shouldEscape = true;
        var showVariables = false;
        var trimEmptyString = false;
        if (modifier == '+') {
            shouldEscape = false;
        } else if (modifier == '.') {
            prefix = '.';
            separator = '.';
        } else if (modifier == '/') {
            prefix = '/';
            separator = '/';
        } else if (modifier == '#') {
            prefix = '#';
            shouldEscape = false;
        } else if (modifier == ';') {
            prefix = ';';
            separator = ';',
                showVariables = true;
            trimEmptyString = true;
        } else if (modifier == '?') {
            prefix = '?';
            separator = '&',
                showVariables = true;
        } else if (modifier == '&') {
            prefix = '&';
            separator = '&',
                showVariables = true;
        }

        var varNames = [];
        var varList = spec.split(',');
        var varSpecs = [];
        var varSpecMap = {};
        for (var i = 0; i < varList.length; i++) {
            var varName = varList[i];
            var truncate = null;
            if (varName.indexOf(':') != -1) {
                var parts = varName.split(':');
                varName = parts[0];
                truncate = parseInt(parts[1]);
            }
            var suffices = {};
            while (UriTemplates.uriTemplateSuffices[varName.charAt(varName.length - 1)]) {
                suffices[varName.charAt(varName.length - 1)] = true;
                varName = varName.substring(0, varName.length - 1);
            }
            var varSpec = {
                truncate: truncate,
                name: varName,
                suffices: suffices
            };
            varSpecs.push(varSpec);
            varSpecMap[varName] = varSpec;
            varNames.push(varName);
        }
        var subFunction = function (valueFunction): any {
            var result = '';
            var startIndex = 0;
            for (var i = 0; i < varSpecs.length; i++) {
                var varSpec = varSpecs[i];
                var value = valueFunction(varSpec.name);
                if (value == null || (Array.isArray(value) && value.length == 0) || (typeof value == 'object' && Object.keys(value).length == 0)) {
                    startIndex++;
                    continue;
                }
                if (i == startIndex) {
                    result += prefix;
                } else {
                    result += (separator || ',');
                }
                if (Array.isArray(value)) {
                    if (showVariables) {
                        result += varSpec.name + '=';
                    }
                    for (var j = 0; j < value.length; j++) {
                        if (j > 0) {
                            result += varSpec.suffices['*'] ? (separator || ',') : ',';
                            if (varSpec.suffices['*'] && showVariables) {
                                result += varSpec.name + '=';
                            }
                        }
                        result += shouldEscape ? encodeURIComponent(value[j]).replace(/!/g, '%21') : UriTemplates.notReallyPercentEncode(value[j]);
                    }
                } else if (typeof value == 'object') {
                    if (showVariables && !varSpec.suffices['*']) {
                        result += varSpec.name + '=';
                    }
                    var first = true;
                    for (var key in value) {
                        if (!first) {
                            result += varSpec.suffices['*'] ? (separator || ',') : ',';
                        }
                        first = false;
                        result += shouldEscape ? encodeURIComponent(key).replace(/!/g, '%21') : UriTemplates.notReallyPercentEncode(value[j])(key);
                        result += varSpec.suffices['*'] ? '=' : ',';
                        result += shouldEscape ? encodeURIComponent(value[key]).replace(/!/g, '%21') : UriTemplates.notReallyPercentEncode(value[j])(value[key]);
                    }
                } else {
                    if (showVariables) {
                        result += varSpec.name;
                        if (!trimEmptyString || value != '') {
                            result += '=';
                        }
                    }
                    if (varSpec.truncate != null) {
                        value = value.substring(0, varSpec.truncate);
                    }
                    result += shouldEscape ? encodeURIComponent(value).replace(/!/g, '%21') : UriTemplates.notReallyPercentEncode(value[j])(value);
                }
            }
            return result;
        };
        var guessFunction = function (stringValue, resultObj) {
            if (prefix) {
                if (stringValue.substring(0, prefix.length) == prefix) {
                    stringValue = stringValue.substring(prefix.length);
                } else {
                    return null;
                }
            }
            if (varSpecs.length == 1 && varSpecs[0].suffices['*']) {
                var varSpec = varSpecs[0];
                var varName = varSpec.name;
                var arrayValue = varSpec.suffices['*'] ? stringValue.split(separator || ',') : [stringValue];
                var hasEquals = (shouldEscape && stringValue.indexOf('=') != -1);	// There's otherwise no way to distinguish between "{value*}" for arrays and objects
                for (var i = 1; i < arrayValue.length; i++) {
                    var stringValue = arrayValue[i];
                    if (hasEquals && stringValue.indexOf('=') == -1) {
                        // Bit of a hack - if we're expecting "=" for key/value pairs, and values can't contain "=", then assume a value has been accidentally split
                        arrayValue[i - 1] += (separator || ',') + stringValue;
                        arrayValue.splice(i, 1);
                        i--;
                    }
                }
                for (var i = 0; i < arrayValue.length; i++) {
                    var stringValue = arrayValue[i];
                    if (shouldEscape && stringValue.indexOf('=') != -1) {
                        hasEquals = true;
                    }
                    var innerArrayValue = stringValue.split(',');
                    for (var j = 0; j < innerArrayValue.length; j++) {
                        if (shouldEscape) {
                            innerArrayValue[j] = decodeURIComponent(innerArrayValue[j]);
                        }
                    }
                    if (innerArrayValue.length == 1) {
                        arrayValue[i] = innerArrayValue[0];
                    } else {
                        arrayValue[i] = innerArrayValue;
                    }
                }

                if (showVariables || hasEquals) {
                    var objectValue = resultObj[varName] || {};
                    for (var j = 0; j < arrayValue.length; j++) {
                        var innerValue = stringValue;
                        if (showVariables && !innerValue) {
                            // The empty string isn't a valid variable, so if our value is zero-length we have nothing
                            continue;
                        }
                        if (typeof arrayValue[j] == 'string') {
                            var stringValue = arrayValue[j];
                            var innerVarName = stringValue.split('=', 1)[0];
                            var stringValue = stringValue.substring(innerVarName.length + 1);
                            innerValue = stringValue;
                        } else {
                            var stringValue = arrayValue[j][0];
                            var innerVarName = stringValue.split('=', 1)[0];
                            var stringValue = stringValue.substring(innerVarName.length + 1);
                            arrayValue[j][0] = stringValue;
                            innerValue = arrayValue[j];
                        }
                        if (objectValue[innerVarName] !== undefined) {
                            if (Array.isArray(objectValue[innerVarName])) {
                                objectValue[innerVarName].push(innerValue);
                            } else {
                                objectValue[innerVarName] = [objectValue[innerVarName], innerValue];
                            }
                        } else {
                            objectValue[innerVarName] = innerValue;
                        }
                    }
                    if (Object.keys(objectValue).length == 1 && objectValue[varName] !== undefined) {
                        resultObj[varName] = objectValue[varName];
                    } else {
                        resultObj[varName] = objectValue;
                    }
                } else {
                    if (resultObj[varName] !== undefined) {
                        if (Array.isArray(resultObj[varName])) {
                            resultObj[varName] = resultObj[varName].concat(arrayValue);
                        } else {
                            resultObj[varName] = [resultObj[varName]].concat(arrayValue);
                        }
                    } else {
                        if (arrayValue.length == 1 && !varSpec.suffices['*']) {
                            resultObj[varName] = arrayValue[0];
                        } else {
                            resultObj[varName] = arrayValue;
                        }
                    }
                }
            } else {
                var arrayValue = (varSpecs.length == 1) ? [stringValue] : stringValue.split(separator || ',');
                var specIndexMap = {};
                for (var i = 0; i < arrayValue.length; i++) {
                    // Try from beginning
                    var firstStarred = 0;
                    for (; firstStarred < varSpecs.length - 1 && firstStarred < i; firstStarred++) {
                        if (varSpecs[firstStarred].suffices['*']) {
                            break;
                        }
                    }
                    if (firstStarred == i) {
                        // The first [i] of them have no "*" suffix
                        specIndexMap[i] = i;
                        continue;
                    } else {
                        // Try from the end
                        for (var lastStarred = varSpecs.length - 1; lastStarred > 0 && (varSpecs.length - lastStarred) < (arrayValue.length - i); lastStarred--) {
                            if (varSpecs[lastStarred].suffices['*']) {
                                break;
                            }
                        }
                        if ((varSpecs.length - lastStarred) == (arrayValue.length - i)) {
                            // The last [length - i] of them have no "*" suffix
                            specIndexMap[i] = lastStarred;
                            continue;
                        }
                    }
                    // Just give up and use the first one
                    specIndexMap[i] = firstStarred;
                }
                for (var i = 0; i < arrayValue.length; i++) {
                    var stringValue = arrayValue[i];
                    if (!stringValue && showVariables) {
                        // The empty string isn't a valid variable, so if our value is zero-length we have nothing
                        continue;
                    }
                    var innerArrayValue = stringValue.split(',');
                    var hasEquals = false;

                    if (showVariables) {
                        var stringValue = innerArrayValue[0]; // using innerArrayValue
                        var varName = stringValue.split('=', 1)[0];
                        var stringValue = stringValue.substring(varName.length + 1);
                        innerArrayValue[0] = stringValue;
                        var varSpec = varSpecMap[varName] || varSpecs[0];
                    } else {
                        var varSpec = varSpecs[specIndexMap[i]];
                        var varName = varSpec.name;
                    }

                    for (var j = 0; j < innerArrayValue.length; j++) {
                        if (shouldEscape) {
                            innerArrayValue[j] = decodeURIComponent(innerArrayValue[j]);
                        }
                    }

                    if ((showVariables || varSpec.suffices['*']) && resultObj[varName] !== undefined) {
                        if (Array.isArray(resultObj[varName])) {
                            resultObj[varName] = resultObj[varName].concat(innerArrayValue);
                        } else {
                            resultObj[varName] = [resultObj[varName]].concat(innerArrayValue);
                        }
                    } else {
                        if (innerArrayValue.length == 1 && !varSpec.suffices['*']) {
                            resultObj[varName] = innerArrayValue[0];
                        } else {
                            resultObj[varName] = innerArrayValue;
                        }
                    }
                }
            }
        };
        subFunction['varNames'] = varNames;
        return {
            prefix: prefix,
            substitution: subFunction,
            unSubstitution: guessFunction
        };
    }

    private static notReallyPercentEncode(string): any {
        return encodeURI(string).replace(/%25[0-9][0-9]/g, function (doubleEncoded) {
            return '%' + doubleEncoded.substring(3);
        });
    }

}
