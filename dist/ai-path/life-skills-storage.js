/* Individual keys prevent a stale tab from replacing another learner's level. */
(() => {
  'use strict';
  window.AIPathLifeSkillsStorage = function createStore(course, ages, lessons, fields) {
    const prefix = 'ai-path-life-skills-' + course + '-v2:';
    const legacyKey = 'ai-path-life-skills-' + course + '-v1';
    const memory = new Map(), pending = new Set();
    let available = true;
    const read = key => {
      if (pending.has(key)) return memory.get(key) ?? null;
      try { const value = localStorage.getItem(key); memory.set(key,value); return value; }
      catch { available = false; return memory.get(key) ?? null; }
    };
    const write = (key,value) => {
      memory.set(key,value);
      try {
        if (value === null) localStorage.removeItem(key); else localStorage.setItem(key,value);
        pending.delete(key); available = pending.size === 0;
      } catch { pending.add(key); available = false; }
    };
    const levelPrefix = age => prefix + age + ':';
    const planKey = (age,field) => levelPrefix(age) + 'plan:' + field;
    const answerKey = (age,lesson,kind) => levelPrefix(age) + 'answer:' + lesson + ':' + kind;
    const positionKey = age => levelPrefix(age) + 'position';
    const object = raw => { try { const value=JSON.parse(raw); return value && typeof value==='object' && !Array.isArray(value) ? value : {}; } catch { return {}; } };
    // Copy legacy data only into absent new keys; retain the original for recovery.
    if (read(prefix + 'migrated') !== '1') {
      const legacy = object(read(legacyKey));
      if (ages.includes(legacy.age) && read(prefix + 'age') === null) write(prefix + 'age',legacy.age);
      for (const age of ages) {
        const old = legacy.levels?.[age];
        if (!old || typeof old !== 'object' || Array.isArray(old)) continue;
        for (const field of fields) {
          if (typeof old.plan?.[field] === 'string' && read(planKey(age,field)) === null) write(planKey(age,field),old.plan[field].slice(0,160));
        }
        for (const lesson of lessons) for (const kind of ['activity','quiz']) {
          if (old.answers?.[lesson]?.[kind] === true && read(answerKey(age,lesson,kind)) === null) write(answerKey(age,lesson,kind),'1');
        }
      }
      write(prefix + 'migrated','1');
    }
    return {
      prefix, levelPrefix,
      available: () => available,
      age: () => { const value=read(prefix + 'age'); return ages.includes(value) ? value : '10-13'; },
      selectAge: age => { if (ages.includes(age)) write(prefix + 'age',age); },
      level: age => {
        const answers = {}, plan = {};
        for (const lesson of lessons) answers[lesson] = {activity:read(answerKey(age,lesson,'activity')) === '1',quiz:read(answerKey(age,lesson,'quiz')) === '1'};
        for (const field of fields) plan[field] = (read(planKey(age,field)) || '').slice(0,160);
        return {answers,plan,position:object(read(positionKey(age)))};
      },
      setPlan: (age,field,value) => { if (ages.includes(age) && fields.includes(field)) write(planKey(age,field),String(value).slice(0,160)); },
      complete: (age,lesson,kind) => { if (ages.includes(age) && lessons.includes(lesson) && ['activity','quiz'].includes(kind)) write(answerKey(age,lesson,kind),'1'); },
      position: (age,lesson,step) => { if (ages.includes(age) && lessons.includes(lesson) && ['task','learn','try','check'].includes(step)) write(positionKey(age),JSON.stringify({lesson,step})); },
      reset: age => {
        if (!ages.includes(age)) return;
        for (const field of fields) write(planKey(age,field),null);
        for (const lesson of lessons) for (const kind of ['activity','quiz']) write(answerKey(age,lesson,kind),null);
        write(positionKey(age),null);
      }
    };
  };
})();
