export type ValueFunction = (name: string) => any;

type BoolMap = Record<string, boolean>;

type SubstitutionFn = ((valueFn: ValueFunction) => string) & { varNames: string[] };

interface ParsedSubstitution {
    prefix: string;
    substitution: SubstitutionFn;
    unSubstitution: (stringValue: string, resultObj: Record<string, any>) => void;
}

export class UriTemplate {

    private static readonly uriTemplateGlobalModifiers: BoolMap = {
        '+': true,
        '#': true,
        '.': true,
        '/': true,
        ';': true,
        '?': true,
        '&': true
    };

    private static readonly uriTemplateSuffices: BoolMap = {
        '*': true
    };

    private readonly textParts: string[];
    private readonly substitutions: SubstitutionFn[];
    private readonly unSubstitutions: Array<(stringValue: string, resultObj: Record<string, any>) => void>;
    private readonly prefixes: string[];

    constructor(public readonly template: string) {
        const parts = template.split('{');
        this.textParts = [parts.shift() ?? ''];
        this.prefixes = [];
        this.substitutions = [];
        this.unSubstitutions = [];

        let varNames: string[] = [];

        while (parts.length > 0) {
            const part = parts.shift() ?? '';
            const spec = part.split('}')[0];
            const remainder = part.substring(spec.length + 1);
            const funcs = this.uriTemplateSubstitution(spec);

            this.substitutions.push(funcs.substitution);
            this.unSubstitutions.push(funcs.unSubstitution);
            this.prefixes.push(funcs.prefix);
            this.textParts.push(remainder);
            varNames = varNames.concat(funcs.substitution.varNames);
        }
    }

    public fill(valueFunction?: Record<string, any> | ValueFunction): string {
        const valueFn: ValueFunction =
            typeof valueFunction === 'function'
                ? (valueFunction as ValueFunction)
                : (varName: string) => (valueFunction as Record<string, any>)[varName];

        let result = this.textParts[0];

        for (let i = 0; i < this.substitutions.length; i++) {
            const substitution = this.substitutions[i];
            result += substitution(valueFn);
            result += this.textParts[i + 1];
        }

        return result;
    }

    public fillFromObject(obj?: Record<string, any>): string {
        return this.fill(obj);
    }

    public fromUri(substituted: string): Record<string, any> | undefined {
        const result: Record<string, any> = {};

        for (let i = 0; i < this.textParts.length; i++) {
            const part = this.textParts[i];

            if (substituted.substring(0, part.length) !== part) {
                return undefined;
            }

            substituted = substituted.substring(part.length);

            if (i >= this.textParts.length - 1) {
                if (substituted === '') {
                    break;
                } else {
                    return undefined;
                }
            }

            let nextPart = this.textParts[i + 1];
            let offset = i;
            let stringValue: string;

            while (true) {
                if (offset === this.textParts.length - 2) {
                    const endPart = substituted.substring(substituted.length - nextPart.length);
                    if (endPart !== nextPart) {
                        return undefined;
                    }
                    stringValue = substituted.substring(0, substituted.length - nextPart.length);
                    substituted = endPart;
                } else if (nextPart) {
                    const nextPartPos = substituted.indexOf(nextPart);
                    stringValue = substituted.substring(0, nextPartPos);
                    substituted = substituted.substring(nextPartPos);
                } else if (this.prefixes[offset + 1]) {
                    let nextPartPos = substituted.indexOf(this.prefixes[offset + 1]);
                    if (nextPartPos === -1) nextPartPos = substituted.length;
                    stringValue = substituted.substring(0, nextPartPos);
                    substituted = substituted.substring(nextPartPos);
                } else if (this.textParts.length > offset + 2) {
                    // If the separator between this variable and the next is blank (with no prefix), continue onwards
                    offset++;
                    nextPart = this.textParts[offset + 1];
                    continue;
                } else {
                    stringValue = substituted;
                    substituted = '';
                }
                break;
            }

            this.unSubstitutions[i](stringValue!, result);
        }

        return result;
    }

    public toString(): string {
        return this.template;
    }

    private uriTemplateSubstitution(spec: string): ParsedSubstitution {
        let modifier = '';
        if (UriTemplate.uriTemplateGlobalModifiers[spec.charAt(0)]) {
            modifier = spec.charAt(0);
            spec = spec.substring(1);
        }

        let separator = '';
        let prefix = '';
        let shouldEscape = true;
        let showVariables = false;
        let trimEmptyString = false;

        if (modifier === '+') {
            shouldEscape = false;
        } else if (modifier === '.') {
            prefix = '.';
            separator = '.';
        } else if (modifier === '/') {
            prefix = '/';
            separator = '/';
        } else if (modifier === '#') {
            prefix = '#';
            shouldEscape = false;
        } else if (modifier === ';') {
            prefix = ';';
            separator = ';';
            showVariables = true;
            trimEmptyString = true;
        } else if (modifier === '?') {
            prefix = '?';
            separator = '&';
            showVariables = true;
        } else if (modifier === '&') {
            prefix = '&';
            separator = '&';
            showVariables = true;
        }

        const varNames: string[] = [];
        const varList = spec.split(',');
        const varSpecs: any[] = [];
        const varSpecMap: Record<string, any> = {};

        for (let i = 0; i < varList.length; i++) {
            let varName: string = varList[i];
            let truncate: number | null = null;

            if (varName.indexOf(':') !== -1) {
                const parts = varName.split(':');
                varName = parts[0];
                truncate = parseInt(parts[1], 10);
            }

            const suffices: BoolMap = {};
            while (UriTemplate.uriTemplateSuffices[varName.charAt(varName.length - 1)]) {
                const lastChar = varName.charAt(varName.length - 1);
                suffices[lastChar] = true;
                varName = varName.substring(0, varName.length - 1);
            }

            const varSpec = {
                truncate,
                name: varName,
                suffices
            };

            varSpecs.push(varSpec);
            varSpecMap[varName] = varSpec;
            varNames.push(varName);
        }

        const subFunction = (function (valueFunction: ValueFunction) {
            let result = '';
            let startIndex = 0;

            for (let i = 0; i < varSpecs.length; i++) {
                const varSpec = varSpecs[i];
                let value = valueFunction(varSpec.name);

                if (
                    value == null ||
                    (Array.isArray(value) && value.length === 0) ||
                    (typeof value === 'object' && Object.keys(value).length === 0)
                ) {
                    startIndex++;
                    continue;
                }

                if (i === startIndex) {
                    result += prefix;
                } else {
                    result += (separator || ',');
                }

                if (Array.isArray(value)) {
                    if (showVariables) {
                        result += varSpec.name + '=';
                    }
                    for (let j = 0; j < value.length; j++) {
                        if (j > 0) {
                            result += varSpec.suffices['*'] ? (separator || ',') : ',';
                            if (varSpec.suffices['*'] && showVariables) {
                                result += varSpec.name + '=';
                            }
                        }
                        result += shouldEscape
                            ? encodeURIComponent(value[j]).replace(/!/g, '%21')
                            : UriTemplate.notReallyPercentEncode(value[j]);
                    }
                } else if (typeof value === 'object') {
                    if (showVariables && !varSpec.suffices['*']) {
                        result += varSpec.name + '=';
                    }
                    let first = true;
                    for (const key in value) {
                        if (!first) {
                            result += varSpec.suffices['*'] ? (separator || ',') : ',';
                        }
                        first = false;
                        result += shouldEscape
                            ? encodeURIComponent(key).replace(/!/g, '%21')
                            : UriTemplate.notReallyPercentEncode(key);
                        result += varSpec.suffices['*'] ? '=' : ',';
                        result += shouldEscape
                            ? encodeURIComponent(value[key]).replace(/!/g, '%21')
                            : UriTemplate.notReallyPercentEncode(value[key]);
                    }
                } else {
                    if (showVariables) {
                        result += varSpec.name;
                        if (!trimEmptyString || value !== '') {
                            result += '=';
                        }
                    }
                    if (varSpec.truncate != null) {
                        value = value.substring(0, varSpec.truncate);
                    }
                    result += shouldEscape
                        ? encodeURIComponent(value).replace(/!/g, '%21')
                        : UriTemplate.notReallyPercentEncode(value);
                }
            }
            return result;
        }) as unknown as SubstitutionFn;

        // --- ORIGINAL guess (de-substitution) function (unchanged logic) ---
        const guessFunction = function (stringValue: string, resultObj: Record<string, any>) {
            if (prefix) {
                if (stringValue.substring(0, prefix.length) === prefix) {
                    stringValue = stringValue.substring(prefix.length);
                } else {
                    return null;
                }
            }

            if (varSpecs.length === 1 && varSpecs[0].suffices['*']) {
                const varSpec = varSpecs[0];
                const varName = varSpec.name;
                let arrayValue: any = varSpec.suffices['*'] ? stringValue.split(separator || ',') : [stringValue];
                let hasEquals = (shouldEscape && stringValue.indexOf('=') !== -1); // There's otherwise no way to distinguish between '{value*}' for arrays and objects

                for (let i = 1; i < arrayValue.length; i++) {
                    const sv: string = arrayValue[i];
                    if (hasEquals && sv.indexOf('=') === -1) {
                        // Bit of a hack - if we're expecting '=' for key/value pairs, and values can't contain '=', then assume a value has been accidentally split
                        arrayValue[i - 1] += (separator || ',') + sv;
                        arrayValue.splice(i, 1);
                        i--;
                    }
                }

                for (let i = 0; i < arrayValue.length; i++) {
                    let sv: string = arrayValue[i];

                    if (shouldEscape && sv.indexOf('=') !== -1) {
                        hasEquals = true;
                    }

                    const innerArrayValue = sv.split(',');
                    for (let j = 0; j < innerArrayValue.length; j++) {
                        if (shouldEscape) {
                            innerArrayValue[j] = decodeURIComponent(innerArrayValue[j]);
                        }
                    }

                    if (innerArrayValue.length === 1) {
                        arrayValue[i] = innerArrayValue[0];
                    } else {
                        arrayValue[i] = innerArrayValue;
                    }
                }

                if (showVariables || hasEquals) {
                    const objectValue = resultObj[varName] || {};
                    for (let j = 0; j < arrayValue.length; j++) {
                        let innerValue: any = stringValue;

                        if (showVariables && !innerValue) {
                            // The empty string isn't a valid variable, so if our value is zero-length we have nothing
                            continue;
                        }

                        let innerVarName: string;

                        if (typeof arrayValue[j] === 'string') {
                            let sv: string = arrayValue[j];
                            innerVarName = sv.split('=', 1)[0];
                            sv = sv.substring(innerVarName.length + 1);
                            innerValue = sv;
                        } else if (Array.isArray(arrayValue[j])) {
                            const arr = arrayValue[j] as string[];
                            let sv: string = arr[0];
                            innerVarName = sv.split('=', 1)[0];
                            sv = sv.substring(innerVarName.length + 1);
                            arr[0] = sv;
                            innerValue = arr;
                        } else {
                            continue;
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

                    if (Object.keys(objectValue).length === 1 && objectValue[varName] !== undefined) {
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
                        if (arrayValue.length === 1 && !varSpec.suffices['*']) {
                            resultObj[varName] = arrayValue[0];
                        } else {
                            resultObj[varName] = arrayValue;
                        }
                    }
                }
            } else {
                const arrayValue = (varSpecs.length === 1) ? [stringValue] : stringValue.split(separator || ',');
                const specIndexMap: Record<number, number> = {};

                for (let i = 0; i < arrayValue.length; i++) {
                    // Try from beginning
                    let firstStarred = 0;
                    for (; firstStarred < varSpecs.length - 1 && firstStarred < i; firstStarred++) {
                        if (varSpecs[firstStarred].suffices['*']) {
                            break;
                        }
                    }
                    if (firstStarred === i) {
                        // The first [i] of them have no '*' suffix
                        specIndexMap[i] = i;
                        continue;
                    } else {
                        // Try from the end
                        for (let lastStarred = varSpecs.length - 1;
                             lastStarred > 0 && (varSpecs.length - lastStarred) < (arrayValue.length - i);
                             lastStarred--) {
                            if (varSpecs[lastStarred].suffices['*']) {
                                break;
                            }
                            if ((varSpecs.length - lastStarred) === (arrayValue.length - i)) {
                                // The last [length - i] of them have no '*' suffix
                                specIndexMap[i] = lastStarred;
                            }
                        }
                    }
                    // Just give up and use the first one
                    specIndexMap[i] = firstStarred;
                }

                for (let i = 0; i < arrayValue.length; i++) {
                    let sv: string = arrayValue[i];
                    if (!sv && showVariables) {
                        // The empty string isn't a valid variable, so if our value is zero-length we have nothing
                        continue;
                    }

                    const innerArrayValue = sv.split(',');

                    let varSpec: any;
                    let varName: string;

                    if (showVariables) {
                        sv = innerArrayValue[0]; // using innerArrayValue
                        varName = sv.split('=', 1)[0];
                        sv = sv.substring(varName.length + 1);
                        innerArrayValue[0] = sv;
                        varSpec = varSpecMap[varName] || varSpecs[0];
                    } else {
                        varSpec = varSpecs[specIndexMap[i]];
                        varName = varSpec.name;
                    }

                    for (let j = 0; j < innerArrayValue.length; j++) {
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
                        if (innerArrayValue.length === 1 && !varSpec.suffices['*']) {
                            resultObj[varName] = innerArrayValue[0];
                        } else {
                            resultObj[varName] = innerArrayValue;
                        }
                    }
                }
            }
        };

        subFunction.varNames = varNames;

        return {
            prefix,
            substitution: subFunction,
            unSubstitution: guessFunction
        };
    }

    private static notReallyPercentEncode(str: string): string {
        return encodeURI(str).replace(/%25[0-9][0-9]/g, (doubleEncoded) => {
            return '%' + doubleEncoded.substring(3);
        });
    }
}
