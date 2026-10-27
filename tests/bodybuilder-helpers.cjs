'use strict';
const assert=require('node:assert/strict');
const{launchBrowser,createPage}=require('./v4-helpers.cjs');
const SAVE_KEY='asobi:bodybuilder:v1',GROUPS=['chest','back','shoulders','arms','quads','core','calves'];
function fixture(overrides={}){return{version:1,day:1,ap:3,coins:60,muscles:Object.fromEntries(GROUPS.map(key=>[key,8])),pending:Object.fromEntries(GROUPS.map(key=>[key,0])),fatigue:0,condition:70,poseSkill:20,league:0,trophies:0,bestContest:0,history:[],mealId:null,nutrients:{protein:3,carbs:3,balance:3},lastExercise:'bench',...overrides}}
async function state(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY)}
async function open(browser,url,options={}){const t=await createPage(browser,url,options);await t.go('bodybuilder');return t}
async function clean(t){await t.home();assert.deepEqual(await t.page.evaluate(()=>__v4Resources()),{intervals:0,frames:0,listeners:0,fetches:0});assert.deepEqual(t.errors,[])}
async function train(page,exercise){
 await page.locator('[data-bb-exercise="'+exercise+'"]').click();await page.locator('#bb-train').click();await page.locator('#bb-rep').scrollIntoViewIfNeeded();
 for(let index=0;index<6;index++){
  await page.waitForFunction(()=>{
   const marker=document.getElementById('bb-marker'),target=document.getElementById('bb-target'),button=document.getElementById('bb-rep');
   if(!marker||!target||!button||button.disabled||button.getAttribute('aria-disabled')==='true')return false;
   const position=Number(marker.dataset.position),center=Number(target.dataset.center);return Number.isFinite(position)&&Number.isFinite(center)&&Math.abs(position-center)<(Math.abs(center)>1?4:.04);
  },null,{timeout:10000});
  if(index===5)await page.locator('#bb-rep').press('Space');else await page.locator('#bb-rep').click();await page.waitForTimeout(120);
 }
 await page.waitForFunction(()=>document.getElementById('bb-workout-data')?.dataset.active==='false',null,{timeout:10000});
}
module.exports={launchBrowser,createPage,open,clean,train,state,fixture,SAVE_KEY,GROUPS};
