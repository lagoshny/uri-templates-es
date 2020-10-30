# UriTemplatesEs
<a href="https://www.npmjs.com/package/uri-templates-es">
  <img src="https://img.shields.io/npm/v/uri-templates-es" alt="Last released npm version" />
</a>&nbsp;

<a href="https://github.com/lagoshny/uri-templates-es/actions?query=workflow%3ABuild">
  <img src="https://img.shields.io/github/workflow/status/lagoshny/uri-templates-es/Build/master" alt="Pipeline info" />
</a>&nbsp;

<a href="https://github.com/lagoshny/uri-templates-es/issues">
  <img src="https://img.shields.io/github/issues/lagoshny/uri-templates-es" alt="Total open issues" />
</a>&nbsp;

<a href="https://www.npmjs.com/package/uri-templates-es">
  <img src="https://img.shields.io/npm/dt/uri-templates-es" alt="Total downloads by npm" />
</a>&nbsp;

<a href="https://mit-license.org/">
  <img src="https://img.shields.io/npm/l/uri-templates-es" alt="License info" />
</a>&nbsp;

<br />
<br />

This is a ported library version built to support `es standard`.

Can find original library [here](https://github.com/geraintluff/uri-templates).

URI Templates ([RFC6570](http://tools.ietf.org/html/rfc6570)) in JavaScript, including de-substitution.

It is tested against the [official test suite](https://github.com/lagoshny/uri-templates-es/tree/master/main/test), including the extended tests **(more that 300 tests)**.

The 'de-substitution' extracts parameter values from URIs.  It is also tested against the official test suite (including extended tests).

## Usages

Install library using the next command:

```
npm i uri-templates-es --save
```

Create a template object:

```javascript
import { UriTemplate } from 'uri-templates-es';

const template1 = new UriTemplate('/date/{colour}/{shape}/');
const template2 = new UriTemplate('/prefix/{?params*}');
```

Example of substitution using an object:

```javascript
// '/categories/green/round/'
const uri1 = template1.fill({colour: 'green', shape: 'round'});

// '/prefix/?a=A&b=B&c=C
const uri2 = template2.fillFromObject({
	params: {a: 'A', b: 'B', c: 'C'}
});
```

Example of substitution using a callback:

```javascript
// '/categories/example_colour/example_shape/'
const uri1b = template1.fill(function (varName) {
	return 'example_' + varName;
});
```


Example of guess variables from URI ('de-substitution'):
```javascript
const uri2b = '/prefix/?beep=boop&bleep=bloop';
const params = template2.fromUri(uri2b);
/*
{
  params: {
    beep: 'boop',
    bleep: 'bloop'
    
  }
*/
```

While templates can be ambiguous (e.g. `'{var1}{var2}'`), it will still produce *something* that reconstructs into the original URI.

It can handle all the cases in the official test suite, including the extended tests:

```javascript
const template = new UriTemplate('{/id*}{?fields,token}');

const values = template.fromUri('/person/albums?fields=id,name,picture&token=12345');
/*
{
  id: ['person', 'albums'],
  fields: ['id', 'name', 'picture'],
  token: '12345'
}
*/
```
