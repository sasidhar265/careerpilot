import test from 'node:test';
import assert from 'node:assert/strict';
import {localGuestUrl} from '../../src/lib/guest.ts';
test('guest links use the built-in route and ignore obsolete secondary-server configuration',()=>{assert.equal(localGuestUrl({}),'/guest');assert.equal(localGuestUrl({GUEST_WORKSPACE_URL:'http://localhost:5173/'}),'/guest');for(const env of [{NODE_ENV:'production'},{APP_URL:'https://public.example'},{APP_URL:'http://user:secret@localhost:3100/'},{APP_URL:'http://localhost:3100/other'}])assert.equal(localGuestUrl(env),null);});
