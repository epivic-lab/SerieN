"""Conservative comparison of catalog snapshots and historical gate SQL.

No database connector. Unexplained differences fail. SQL tokens preserve literal
contents, quoted identifiers and order; only comments, whitespace, unquoted case,
and the delimiter of a SQL function body are ignored. No algebraic equivalence
or full Auth/PostgREST equivalence is claimed.
"""
import difflib
import json
import re


def sql_tokens(text):
    tokens, i = [], 0
    while i < len(text):
        if text[i].isspace():
            i += 1
        elif text.startswith('--', i):
            end = text.find('\n', i)
            i = len(text) if end < 0 else end + 1
        elif text.startswith('/*', i):
            depth, i = 1, i + 2
            while depth and i < len(text):
                if text.startswith('/*', i):
                    depth, i = depth + 1, i + 2
                elif text.startswith('*/', i):
                    depth, i = depth - 1, i + 2
                else:
                    i += 1
            if depth:
                raise ValueError('Unclosed SQL comment')
        elif text[i] in "'\"":
            quote, start, i = text[i], i, i + 1
            while i < len(text):
                if text[i] == quote:
                    i += 1
                    if i < len(text) and text[i] == quote:
                        i += 1
                        continue
                    break
                i += 1
            else:
                raise ValueError('Unclosed quoted SQL token')
            tokens.append(text[start:i])
        else:
            dollar = re.match(r'\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$', text[i:])
            if dollar:
                tag = dollar[0]
                end = text.find(tag, i + len(tag))
                if end < 0:
                    raise ValueError('Unclosed SQL body')
                # Used only for the SQL function body in the historical gate.
                tokens.append(('function_body', sql_tokens(text[i+len(tag):end])))
                i = end + len(tag)
                continue
            word = re.match(r'[A-Za-z_][A-Za-z_0-9$]*|[0-9]+', text[i:])
            if word:
                tokens.append(word[0].lower())
                i += len(word[0])
            else:
                tokens.append(text[i])
                i += 1
    return tokens


SQL_FIELDS = {'source', 'definition', 'default', 'using', 'check'}


def canonical(value, field=None):
    if isinstance(value, str) and field in SQL_FIELDS:
        return json.dumps(sql_tokens(value), ensure_ascii=False)
    if isinstance(value, dict):
        return {k: canonical(v, k) for k, v in sorted(value.items())}
    if isinstance(value, list):
        # Catalog rows, ACL entries, role/config sets: no positional SQL arrays.
        return sorted((canonical(v) for v in value), key=lambda v: json.dumps(v, sort_keys=True))
    return value


def compare(expected, actual):
    before = json.dumps(canonical(expected), sort_keys=True, indent=2).splitlines()
    after = json.dumps(canonical(actual), sort_keys=True, indent=2).splitlines()
    return '\n'.join(difflib.unified_diff(before, after, fromfile='remote-observed', tofile='isolated-replay'))
