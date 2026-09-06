export interface SlowlyWord { id: string; en: string; zh: string }

// Original BeatGarden editorial vocabulary. No runtime or content is imported from
// IslandSlonelyFall; its source/licence was unavailable during the B1 provenance audit.
export const FEELINGS: readonly SlowlyWord[] = [
  ['calm','Calm','平静'],['relieved','Relieved','如释重负'],['hopeful','Hopeful','有希望'],['grateful','Grateful','感激'],['interested','Curious','好奇'],['connected','Connected','有连接感'],['safe','Safe','安心'],['proud','Proud','自豪'],['tender','Tender','柔软'],['tired','Tired','疲惫'],['sad','Sad','难过'],['worried','Worried','担心'],['overwhelmed','Overwhelmed','不堪重负'],['lonely','Lonely','孤单'],['frustrated','Frustrated','挫败'],['confused','Confused','困惑'],['hurt','Hurt','受伤'],['tense','Tense','紧绷'],
  ['joyful','Joyful','喜悦'],['content','Content','满足'],['encouraged','Encouraged','受到鼓舞'],['surprised','Surprised','惊讶'],['vulnerable','Vulnerable','脆弱'],['disappointed','Disappointed','失望'],['discouraged','Discouraged','泄气'],['ashamed','Ashamed','羞愧'],['guilty','Guilty','内疚'],['irritated','Irritated','烦躁'],['angry','Angry','生气'],['resentful','Resentful','委屈'],['afraid','Afraid','害怕'],['insecure','Insecure','不安'],['numb','Numb','麻木'],['restless','Restless','坐立不安'],['embarrassed','Embarrassed','尴尬'],['exhausted','Exhausted','精疲力竭'],
].map(([id,en,zh]) => ({ id,en,zh }));

export const NEEDS: readonly SlowlyWord[] = [
  ['rest','Rest','休息'],['safety','Safety','安全感'],['understanding','Understanding','被理解'],['support','Support','支持'],['connection','Connection','连接'],['belonging','Belonging','归属感'],['autonomy','Autonomy','自主'],['choice','Choice','选择'],['clarity','Clarity','清晰'],['honesty','Honesty','诚实'],['respect','Respect','尊重'],['fairness','Fairness','公平'],['trust','Trust','信任'],['space','Space','空间'],['boundaries','Boundaries','边界'],['care','Care','关怀'],['comfort','Comfort','安慰'],['appreciation','Being seen','被看见'],['competence','Competence','胜任感'],['meaning','Meaning','意义'],['play','Play','玩乐'],['ease','Ease','轻松'],['stability','Stability','稳定'],['hope','Hope','希望'],
].map(([id,en,zh]) => ({ id,en,zh }));
