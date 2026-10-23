import {test} from 'node:test';
import assert from 'node:assert/strict';
import {availableCopilotModels,selectedCopilotModel} from './copilot-models.js';
test('only account-listed models with valid IDs and allowed policy appear',()=>{
 const models=availableCopilotModels({models:[{id:'haiku',name:'Claude Haiku'},{id:'sonnet',name:'Claude Sonnet',policy:{state:'enabled'}},{id:'opus',policy:{state:'disabled'}},{id:'haiku',name:'Duplicate'},{id:'bad --flag'},{id:'account-model'}]});
 assert.deepEqual(models.map(m=>m.id),['haiku','sonnet','account-model']);
 assert.equal(models[0].name,'Claude Haiku');assert.equal(models[2].name,'account-model');
 assert.equal(selectedCopilotModel(models,''),null);assert.equal(selectedCopilotModel(models,'opus'),null);assert.equal(selectedCopilotModel(models,'sonnet').name,'Claude Sonnet');
});
test('missing or empty runtime models never invent account choices',()=>{
 assert.equal(availableCopilotModels({unexpected:[]}),null);assert.deepEqual(availableCopilotModels([]),[]);assert.equal(selectedCopilotModel(null,'opus'),null);
});
