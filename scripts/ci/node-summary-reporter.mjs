/** Compact failure/skip diagnostics; reporting never changes the test outcome. */
import {inspect} from 'node:util';
const text = (value, limit = 1600) => typeof value === 'string' ? value.slice(0, limit) : inspect(value, {depth: 2, maxArrayLength: 6, maxStringLength: 400}).slice(0, limit);
export default async function* report(events) {
  for await (const {type, data} of events) {
    if (type === 'test:fail') {
      const error = data.details?.error;
      const cause = error?.cause ?? error;
      yield JSON.stringify({type, name: data.name, file: data.file, line: data.line,
        message: text(cause?.message), expected: text(cause?.expected, 600),
        actual: typeof cause?.actual === 'string' && cause.actual.length > 600 ? `[string, ${cause.actual.length} characters; see full TAP]` : text(cause?.actual, 600),
        operator: cause?.operator, stack: text(cause?.stack, 1800)}) + '\n';
    } else if (type === 'test:pass' && data.skip) {
      yield JSON.stringify({type: 'test:skip', name: data.name, file: data.file, reason: data.skip}) + '\n';
    } else if (type === 'test:summary' && (!data.file || !data.success)) {
      yield JSON.stringify({type, data}) + '\n';
    }
  }
}
