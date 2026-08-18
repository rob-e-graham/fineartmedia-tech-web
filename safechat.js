/**
 * Safechat — Browser bundle
 *
 * Standalone version that works in any browser without Node.js.
 * Loads crisis resources inline (no filesystem access needed).
 *
 * Usage:
 *   <script src="https://unpkg.com/safechat/src/browser.js"></script>
 *   <script>
 *     const result = Safechat.check("I feel hopeless");
 *     if (result.level !== "none") Safechat.showModal(result);
 *   </script>
 */

(function (root) {
  "use strict";

  // ── Input normalisation ──

  function normalise(text) {
    var t = text.toLowerCase();
    t = t.replace(/[\s ]+/g, " ").trim();
    t = t.replace(/[\u200B-\u200D\uFEFF]/g, "");
    t = t.replace(/[‘’‚‛]/g, "'");
    t = t.replace(/[“”„‟]/g, '"');
    t = t.replace(/\bsuicde\b/g,"suicide").replace(/\bsuiside\b/g,"suicide");
    t = t.replace(/\bsu[i1!|]c[i1!|]de\b/g,"suicide");
    t = t.replace(/\bsuciide?\b/g,"suicide").replace(/\bsuidice?\b/g,"suicide").replace(/\bsuicd\b/g,"suicide");
    t = t.replace(/\boverdoze\b/g,"overdose").replace(/\boverdoase\b/g,"overdose");
    t = t.replace(/\bdiss?ap+ear\b/g,"disappear").replace(/\bdisapear\b/g,"disappear");
    t = t.replace(/\bkil\b/g,"kill");
    t = t.replace(/\bimma\b/g,"i am going to");
    t = t.replace(/\bthnking\b/g,"thinking");
    // Misspellings — self-harm / methods
    t = t.replace(/\bselfharm\b/g,"self-harm").replace(/\bselh[- ]?arm\b/g,"self-harm");
    t = t.replace(/\bhaning\b/g,"hanging").replace(/\bjumpin\b/g,"jumping");
    t = t.replace(/\bswalowing\b/g,"swallowing").replace(/\bbleding\b/g,"bleeding");
    // Expanded negations → contractions
    t = t.replace(/\bdo not\b/g,"don't").replace(/\bcannot\b/g,"can't").replace(/\bcan not\b/g,"can't");
    t = t.replace(/\bwill not\b/g,"won't").replace(/\bshould not\b/g,"shouldn't").replace(/\bwould not\b/g,"wouldn't");
    t = t.replace(/\bdoes not\b/g,"doesn't").replace(/\bdid not\b/g,"didn't");
    t = t.replace(/\bhave not\b/g,"haven't").replace(/\bhas not\b/g,"hasn't");
    t = t.replace(/\bis not\b/g,"isn't").replace(/\bare not\b/g,"aren't");
    t = t.replace(/\bwere not\b/g,"weren't").replace(/\bwas not\b/g,"wasn't");
    // Text-speak
    t = t.replace(/\bwanna\b/g,"want to").replace(/\bgonna\b/g,"going to").replace(/\bgotta\b/g,"got to");
    t = t.replace(/\bwant 2\b/g,"want to").replace(/\b2 die\b/g,"to die");
    t = t.replace(/\bkms\b/g,"kill myself").replace(/\bkys\b/g,"kill yourself");
    t = t.replace(/\bidk\b/g,"i don't know").replace(/\birl\b/g,"in real life");
    t = t.replace(/\btbh\b/g,"to be honest").replace(/\bngl\b/g,"not going to lie");
    t = t.replace(/\bsm\b/g,"so much").replace(/\brn\b/g,"right now");
    t = t.replace(/\bcan'?t be arsed\b/g,"can't be bothered");
    t = t.replace(/\bcba\b/g,"can't be bothered").replace(/\bcbb\b/g,"can't be bothered");
    t = t.replace(/\bdon'?t wanna\b/g,"don't want to").replace(/\bi'?m done\b/g,"i am done");
    return t;
  }

  // ── False-positive guards ──

  var FP_CUT = /\bcut(ting)? my (hair|nails?|finger|losses?|cake|lawn|grass|ties|cord|cards?|teeth)\b/i;
  var FP_HURT = /\bhurt(ing|s)? my (ankle|back|knee|leg|arm|hand|foot|feet|neck|shoulder|wrist|finger|elbow|head|eye|feelings?|pride)\b/i;
  var FP_BLEED = /\b(economy|market|company|stock|budget|money)\b.*\bbleed|\bbleed.*\b(economy|market|company|stock|budget|money)\b/i;
  var FP_SUICIDE = /\bsuicide (squeeze|bunt|pass|mission|door|prevention|awareness|hotline|class)\b|\b(that|this) (joke|movie|show|game|song|set) was suicide\b/i;
  var FP_JUMP = /\bjump(ing)? (off|from) (the topic|that|this topic|there|here|one thing)\b/i;
  var FP_OD = /\boverdose[ds]? on (coffee|caffeine|sugar|chocolate|candy|pizza|food|information|data)\b/i;
  var FP_HTML = /class\s*=\s*['"][^'"]*suicid/i;
  var FP_OVER = /\b(game|match|race|show|round|season|movie|film|series|tournament|semester|chapter)\b.*\bover for me\b/i;
  var FP_DISAPPEAR = /\b(magic trick|magician|card|coin|rabbit)\b.*\bdisappear\b/i;
  var FP_NUMB = /\b(finger|hand|foot|toe|arm|leg|face|lip|tongue)s?\b.*\bnumb\b|\bnumb\b.*\b(finger|hand|foot|toe|arm|leg|face|lip|tongue)s?\b/i;
  var FP_TIRED = /\b(tired|sick|exhausted) of (waiting|cooking|cleaning|working|commuting|traffic|my job|the weather|this meeting|homework|studying)\b/i;
  var FP_GIVING = /\b(giv(e|ing) away|gave away)\b.*\b(free|promotion|contest|charity|raffle|giveaway)\b/i;
  var FP_SLEEP = /\bcan'?t sleep\b.*\b(coffee|caffeine|noisy|loud|snoring|neighbou?r|heat|cold|jet lag|excited)\b/i;
  var FP_DELETE = /\b(delet(e|ing|ed))\b.*\b(files?|folders?|apps?|cache|duplicates?|old (photos?|emails?|files?))\b/i;
  var FP_KILL_MOD = /\b(kill|killed|killing) (time|the lights|a process|the server|a task|a habit|the mood|the performance|it|this)\b/i;
  var FP_SHOOT_MOD = /\bshoot(ing)? (hoops|a video|photos?|an email|a message|the breeze)\b/i;
  var FP_BOMB_MOD = /\b(bombed|bombing|bomb) (the exam|an exam|a test|on stage|at karaoke|a performance|a joke)\b/i;
  var FP_ATTACK_MOD = /\b(attack|attacking) (the problem|a bug|this task|the issue|the project)\b/i;
  var FP_THREAT_MOD = /\b(threat model|threat detection|security threat|threat assessment|threat level)\b/i;
  var FP_HATE_MOD = /\bi hate (monday|mondays|traffic|homework|this app|this bug|my job|the weather|cooking|waiting)\b/i;
  var FP_SLUR_CONTEXT_MOD = /\b(flame retardant|fire retardant|retardant paint|dyke wall|dyke geology)\b/i;

  function isFP(t, matched) {
    if (/cut/.test(matched) && FP_CUT.test(t)) return true;
    if (/hurt/.test(matched) && FP_HURT.test(t)) return true;
    if (/bleed/.test(matched) && FP_BLEED.test(t)) return true;
    if (/suicid/.test(matched) && (FP_SUICIDE.test(t) || FP_HTML.test(t))) return true;
    if (/jump/.test(matched) && FP_JUMP.test(t)) return true;
    if (/overdose/.test(matched) && FP_OD.test(t)) return true;
    if (/over for me/.test(matched) && FP_OVER.test(t)) return true;
    if (/disappear/.test(matched) && FP_DISAPPEAR.test(t)) return true;
    if (/numb/.test(matched) && FP_NUMB.test(t)) return true;
    if (/tired|exhausted|sick/.test(matched) && FP_TIRED.test(t)) return true;
    if (/giv/.test(matched) && FP_GIVING.test(t)) return true;
    if (/sleep/.test(matched) && FP_SLEEP.test(t)) return true;
    if (/delet/.test(matched) && FP_DELETE.test(t)) return true;
    return false;
  }

  function isModerationFP(t, matched) {
    if (/kill|killed|killing/.test(matched) && FP_KILL_MOD.test(t)) return true;
    if (/shoot/.test(matched) && FP_SHOOT_MOD.test(t)) return true;
    if (/bomb/.test(matched) && FP_BOMB_MOD.test(t)) return true;
    if (/attack/.test(matched) && FP_ATTACK_MOD.test(t)) return true;
    if (/threat/.test(matched) && FP_THREAT_MOD.test(t)) return true;
    if (/hate/.test(matched) && FP_HATE_MOD.test(t)) return true;
    if (FP_SLUR_CONTEXT_MOD.test(t)) return true;
    return false;
  }

  // ── HTML escaping (prevents XSS in dynamic content) ──

  function escHTML(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── Detection (synced with detect.js) ──

  var HIGH_SIGNALS = [
    // Explicit suicidal language
    /\bsuicid/i, /\bkill (my|myself|me)\b/i, /\bend(ing)? (my|this) life\b/i,
    /\btake my (own )?life\b/i, /\bwant to die\b/i,
    /\bwish (i was|i were|i'm) dead\b/i, /\bdon'?t want to (be here|live|exist|be alive)\b/i,
    /\bno reason to live\b/i, /\bself[- ]?harm/i, /\bhurt(ing)? (my|myself)\b/i,
    /\bcut(ting)? (my|myself)\b/i, /\boverdose\b/i, /\bhanging (my|myself)\b/i,
    /\bjump(ing)? (off|from)\b/i, /\bpills?\b.*\b(take|swallow|end)\b/i,
    /\b(end|stop) the pain\b/i, /\bslit(ting)? my\b/i, /\bbleed(ing)? out\b/i,
    /\bshoot(ing)? (my|myself)\b/i, /\bdrown(ing)? (my|myself)\b/i,
    // Slang
    /\boff myself\b/i, /\btop myself\b/i,
    /\bunalive (myself|me)\b/i, /\bself[- ]?delete\b/i, /\bdelete myself\b/i,
    /\berase myself\b/i, /\b(log out|checkout|check out) (of life|forever|for good)\b/i,
    /\bbetter off dead\b/i,
    // Methods
    /\b(easiest|best|fastest|quickest|simplest) way to die\b/i,
    /\bhow (to|do i|can i|would i) (kill|end|off) (myself|my life|it all)\b/i,
    // Finality
    /\b(this is )?the end (for|of) me\b/i,
    /\bwant (it all|everything|this) to (end|be over|stop)\b/i,
    /\bwant the pain to (stop|end|go away)\b/i,
    /\b(it|this) will (all )?be over soon\b/i,
    // Behavioural warning signs
    /\b(writing|wrote|write) (my )?(goodbye|suicide|farewell) (letters?|notes?|message)\b/i,
    /\bgave away (all |everything|my stuff|my things|my possessions)\b/i,
    /\bwon'?t be (here|around|alive) (much )?longer\b/i,
    /\bwon'?t (be a problem|have to worry about me|bother anyone)\b/i,
    /\bdon'?t care if i (wake|die|live)\b/i,
    /\bi have a plan\b.*\b(tonight|today|tomorrow|this week|the night)\b/i,
    /\b(do|doing) something (stupid|drastic|rash|permanent)\b/i,
    // v1.1 expanded signals
    /\bwant(ing)? to disappear\b/i,
    /\b(nobody|no one) (will|would) (even )?(notice|care|miss me) (if|when) i('?m| am) gone\b/i,
    /\bready to (die|go|end it|leave this world)\b/i,
    /\b(put|putting) (my|the) affairs in order\b/i,
    /\bmaking (my |a )?(last|final) (wish|will|arrangement)\b/i,
    /\bsay(ing)? goodbye to everyone\b/i,
    /\bno(thing| one)? (can|will) (save|help|stop) me\b/i,
    /\b(life|living) is(n'?t| not) worth (it|the (pain|effort|struggle))\b/i,
    /\bi'?ve (made|reached) (my|a) decision\b.*\b(end|die|gone|tonight|tomorrow)\b/i,
    /\bthis (is |will be )?(my )?last (day|night|time|message|goodbye)\b/i,
    /\bthere('?s| is) no (coming back|turning back|going back)\b/i,
    /\bi (just )?need (it|everything|this) to (stop|end|be over)\b/i,
  ];

  var LOW_SIGNALS = [
    /\bcan'?t go on\b/i, /\bno point\b/i, /\bnobody (cares|would miss me|will miss me|would notice|will notice)\b/i,
    /\beveryone (would be |is )?better off (without me)?\b/i, /\bworthless\b/i,
    /\b(completely |utterly |totally )?hopeless\b/i, /\bending it (all)?\b/i,
    /\bnot worth (living|it)\b/i, /\bgive up on (life|everything|myself)\b/i,
    /\bwhat('?s| is) the point\b/i, /\bi (just )?can'?t (do this|take (it|this)( anymore)?|anymore)\b/i,
    /\bno way out\b/i, /\btoo much to bear\b/i, /\bno one (cares|understands|would miss|will miss|would notice|will notice)\b/i,
    /\bi('?m| am) (a |so |such a )?burden\b/i, /\blife is(n'?t| not) worth\b/i,
    /\bwish i (wasn'?t|weren'?t) (here|alive|born)\b/i,
    /\bcan'?t (see|find) (a |any )?(way |reason )?(to go on|forward|out)\b/i,
    /\btrapped\b.*\b(no|can'?t|won'?t)\b/i, /\bnothing (left|matters|to live for)\b/i,
    /\bdon'?t see a future\b/i,
    /\b(easier|better) if i (wasn'?t|weren'?t|am not) here\b/i,
    /\b(it'?s |it is )?over for me\b/i,
    /\bdone with (life|everything|all of this|living)\b/i,
    /\bno hope (for me|left|anymore)\b/i,
    // v1.1 expanded signals
    /\bwhat'?s (even )?the point of (living|being alive|going on|trying)\b/i,
    /\bcan'?t (keep|carry on|continue|keep going) (like this|anymore)\b/i,
    /\bworld (would be|is) better (off )?without me\b/i,
    /\b(i |i'?m )?(so |really |just )?(exhausted|drained|empty) (inside|of (life|everything|living))\b/i,
    /\bfeel(ing|s)? (like |so )?numb\b/i,
    /\bdon'?t (feel|have) (anything|any emotions?|any feelings?)\b/i,
    /\b(i |i'?m )?(completely|totally|utterly) (alone|isolated|empty)\b/i,
    /\bnever get(ting|s)? better\b/i,
    /\bdon'?t (want to|wanna) wake up\b/i,
    /\bcan'?t (face|handle) (another|tomorrow|the morning)\b/i,
    /\b(i'?m|i am) (so |just )?(tired|sick) of (living|life|everything|fighting|trying)\b/i,
    /\bno(body| one) (would|will) (ever )?(understand|help|miss|notice)\b/i,
    /\bdon'?t (belong|fit in) (here|anywhere)\b/i,
    /\b(broken|damaged) beyond (repair|fixing|help)\b/i,
    /\bgiven up (on|trying|hope|myself|everything)\b/i,
    /\b(always|forever) (be |feel )?(alone|lonely|miserable|unhappy)\b/i,
    /\bcan'?t (escape|get away from) (this|it|the pain|my thoughts?)\b/i,
    /\bdon'?t (deserve|have the right) to (live|be happy|be alive|be here)\b/i,
  ];

  var REVIEWED_SIGNAL_PACK = {
    version: "2026-06-18",
    status: "draft-research",
    language: "en",
    reviewAfter: "2026-09-12",
  };

  var REVIEWED_SIGNAL_SOURCES = {
    cssrs_2011: {
      shortName: "C-SSRS",
      title: "Columbia-Suicide Severity Rating Scale",
      url: "https://doi.org/10.1176/appi.ajp.2011.10111704",
    },
    reddit_cssrs_2019: {
      shortName: "Reddit C-SSRS",
      title: "Knowledge-aware suicide risk severity dataset",
      url: "https://doi.org/10.1145/3308558.3313698",
    },
    clpsych_2019: {
      shortName: "CLPsych 2019",
      title: "Suicide risk shared task in Reddit posts",
      url: "https://aclanthology.org/W19-3003/",
    },
    clpsych_2021: {
      shortName: "CLPsych 2021",
      title: "Suicidality prediction in a secure enclave",
      url: "https://aclanthology.org/2021.clpsych-1.7/",
    },
    erisk_self_harm_2021: {
      shortName: "eRisk Self-Harm",
      title: "Early detection of signs of self-harm",
      url: "https://erisk.irlab.org/2021/index.html",
    },
    mindguard_2026: {
      shortName: "MindGuard",
      title: "Multi-turn mental-health safety classifiers",
      url: "https://arxiv.org/abs/2602.00950",
    },
    mentalchat16k_2025: {
      shortName: "MentalChat16K",
      title: "Conversational mental-health assistance benchmark",
      url: "https://doi.org/10.1145/3711896.3737393",
    },
    mentalllama_2023: {
      shortName: "MentalLLaMA",
      title: "Interpretable mental-health analysis models",
      url: "https://github.com/SteveKGYang/MentalLLaMA",
    },
    vera_mh_2026: {
      shortName: "VERA-MH v1.1",
      title: "Validation of Ethical and Responsible AI in Mental Health",
      url: "https://github.com/SpringCare/VERA-MH",
    },
  };

  var REVIEWED_HIGH_SIGNALS = [
    { level:"high", sourceId:"vera_mh_2026", family:"active_ideation_or_method", rationale:"VERA-MH includes hedged active-ideation presentations that refer to ways of ending or being gone.", re:/\b(keep |kept |been )?(thinking|thought) about ways? (i (could|might|would) )?(to )?(end it|end things|be gone|not be here|do it)\b/i },
    { level:"high", sourceId:"vera_mh_2026", family:"intent_plan_and_timeframe", rationale:"A stated plan or intent combined with a near-term timeframe requires immediate routing.", re:/\b(have|got|made) (a )?plan\b.*\b(tonight|today|right now|next hour|soon|follow through)\b|\b(planning|going) to (end it|end things|do it) (all )?(tonight|today|right now)\b/i },
    { level:"high", sourceId:"vera_mh_2026", family:"preparatory_behaviour", rationale:"Preparing means or setting items aside alongside self-directed intent is a high-urgency presentation.", re:/\b(gathered|got|set|put|have) (some |my |the )?(pills|things|stuff|means) (ready|aside|together)\b.*\b(end it|do it|not be here|tonight|in case)\b|\b(ready|aside|together)\b.*\b(pills|means)\b.*\b(end it|do it|not be here)\b/i },
    { level:"high", sourceId:"vera_mh_2026", family:"recent_attempt_or_interruption", rationale:"VERA-MH treats recent attempts, aborted attempts, and interrupted attempts as immediate-risk presentations.", re:/\b(tried|attempted) to end it( all)?\b|\btried something\b.*\b(stopped|someone stopped me|not do it again)\b/i },
    { level:"high", sourceId:"vera_mh_2026", family:"method_research_with_self_reference", rationale:"Self-referential method research or preparatory searching is actionable even when hedged.", re:/\b(looked|looking|searching) up (how|ways?|methods?|how many pills)\b.*\b(end|do it|die|not wake|last night|tonight)\b|\bhow many pills\b.*\b(do it|would do it|to die|not wake)\b/i },
    { level:"high", sourceId:"vera_mh_2026", family:"loss_of_self_safety", rationale:"Feeling unsafe with one's own thoughts indicates an immediate need for human support.", re:/\bi (don'?t|do not) feel safe with (my|these) (own )?thoughts?( tonight| right now| anymore)?\b/i },
    { level:"high", sourceId:"vera_mh_2026", family:"imminent_finality", rationale:"Direct finality language plus a near-term timeframe is treated as high urgency.", re:/\b(going to|gonna|i have to) (end it|do it) (all )?(tonight|today|right now)\b|\b(i have|everything is|things are) (all )?ready\b.*\b(tonight|end it|do it)\b/i },
    { level:"high", sourceId:"cssrs_2011", family:"active_suicidal_thoughts", rationale:"C-SSRS active suicidal thoughts map to immediate routing.", re:/\b(thoughts?|thinking|keep thinking|been thinking) (of|about) (killing|ending|hurting|harming) (myself|my life)\b/i },
    { level:"high", sourceId:"cssrs_2011", family:"method_or_plan", rationale:"C-SSRS method/plan/intent language is treated as high urgency.", re:/\bi (know|have|had|found|chose|chosen|picked|worked out|made|have worked out|have found|have chosen|have picked|have made) (a )?(method|way|plan)\b.*\b(kill|end|hurt|harm|die|overdose)\b/i },
    { level:"high", sourceId:"cssrs_2011", family:"method_or_plan", rationale:"Specific method knowledge or planning requires crisis routing.", re:/\b(i know how|i have worked out how|i figured out how) (i would|to|i can) (do it|end it|kill myself|end my life)\b/i },
    { level:"high", sourceId:"cssrs_2011", family:"intent_or_imminence", rationale:"Self-described loss of immediate safety is actionable crisis language.", re:/\bi can'?t keep myself safe( tonight| today| right now| anymore)?\b/i },
    { level:"high", sourceId:"mindguard_2026", family:"actionable_self_harm", rationale:"MindGuard-style actionable-harm signals include imminent self-harm risk.", re:/\bi('?m| am) (scared|afraid|worried) i (will|might|could|may) (hurt|harm|kill|cut) myself\b/i },
    { level:"high", sourceId:"reddit_cssrs_2019", family:"self_harm_urge", rationale:"Self-harm urge language maps to self-directed harm indicators.", re:/\b(the urge|urges|impulse|impulses) to (cut|hurt|harm|kill) myself\b/i },
    { level:"high", sourceId:"reddit_cssrs_2019", family:"self_harm_recurrence", rationale:"Recent recurrence of self-harm behaviour should route to support.", re:/\bi (relapsed|started|began) (cutting|self[- ]?harming|hurting myself|harming myself) again\b/i },
    { level:"high", sourceId:"clpsych_2019", family:"preparatory_or_farewell", rationale:"Preparatory behaviour and farewell language align with severe-risk evidence families.", re:/\bi('?ve| have) (been )?(saying goodbye|making goodbye messages|writing goodbye messages|writing goodbye notes)\b/i },
    { level:"high", sourceId:"clpsych_2021", family:"recent_attempt_or_near_attempt", rationale:"Recent attempt or near-attempt disclosure requires immediate crisis routing.", re:/\bi (tried|attempted|almost|nearly) to (kill|end|hurt|harm) (myself|my life)\b/i },
    { level:"high", sourceId:"mindguard_2026", family:"immediate_self_safety", rationale:"Actionable self-harm risk includes inability to trust oneself alone.", re:/\bi don'?t trust myself (alone|by myself|right now|tonight|today)\b/i },
  ];

  var REVIEWED_LOW_SIGNALS = [
    { level:"low", sourceId:"vera_mh_2026", family:"passive_absence", rationale:"VERA-MH personas include hedged wishes that it would be easier not to be present or alive.", re:/\b(it would|it'?d|things would|everything would) be easier (for everyone )?(if i (just )?)?(wasn'?t|weren'?t|was not|were not|am not) (here|around|alive)\b|\beasier (to|if i could) (just )?(not be here|not exist|disappear|be gone)\b/i },
    { level:"low", sourceId:"vera_mh_2026", family:"passive_absence", rationale:"Repeated thoughts about not being present are routed softly even when intent is denied.", re:/\b(keep |kept |been )?(thinking|think|thoughts?) (about )?(it would be easier )?(if i )?(just )?(wasn'?t|weren'?t|was not|were not|not being|not be) (here|around|alive)\b/i },
    { level:"low", sourceId:"vera_mh_2026", family:"passive_death_wish", rationale:"Not-waking language is a passive suicidal-thought presentation in VERA-MH.", re:/\b(it would|it'?d|might) be easier (if i )?(just )?(didn'?t|did not|don'?t|do not|couldn'?t|could not) wake up\b|\bwouldn'?t matter if i didn'?t wake up\b/i },
    { level:"low", sourceId:"vera_mh_2026", family:"passive_nonexistence", rationale:"A wish not to exist is routed as passive ideation unless stronger intent is present.", re:/\b(wish|wishing) i could (just )?(not exist|disappear|be gone|check out)\b|\bbetter if i (just )?(didn'?t|did not) exist\b/i },
    { level:"low", sourceId:"vera_mh_2026", family:"social_withdrawal_finality", rationale:"Questioning whether it is worth remaining is a crisis-adjacent presentation.", re:/\b(wonder|wondering|not sure) if (it'?s|it is) (even )?worth (sticking around|being here|carrying on)\b/i },
    { level:"low", sourceId:"vera_mh_2026", family:"loss_of_reason_for_presence", rationale:"A stated lack of reason to remain present should trigger a soft safety response.", re:/\b(i )?(don'?t|do not|can'?t|cannot) (really )?(see|have|find) a reason to be here\b/i },
    { level:"low", sourceId:"cssrs_2011", family:"wish_to_be_dead", rationale:"C-SSRS wish-to-be-dead language maps to passive ideation and should at least trigger a soft safety response.", re:/\bwish (i could |i would |i'?d |i can )?(go to sleep|fall asleep) and (not|never) wake up\b/i },
    { level:"low", sourceId:"cssrs_2011", family:"wish_to_be_dead", rationale:"Passive non-existence language is crisis-adjacent even without stated intent.", re:/\bi (would rather|wish i could|wish i would) (not exist|not be alive|never have been born)\b/i },
    { level:"low", sourceId:"reddit_cssrs_2019", family:"perceived_burdensomeness", rationale:"Perceived burdensomeness is a recurrent suicide-risk language family.", re:/\bi('?m| am| feel like) (just )?(taking up space|a waste of space|a burden to everyone|nothing but a burden)\b/i },
    { level:"low", sourceId:"clpsych_2019", family:"social_erasure", rationale:"Low-to-moderate risk language often includes social erasure and not-being-missed themes.", re:/\b(people|everyone|they) (would be|would feel|will be) (relieved|better|happier) if i (was gone|were gone|left|disappeared|vanished)\b/i },
    { level:"low", sourceId:"clpsych_2019", family:"social_erasure", rationale:"Vanishing/not mattering language is routed softly unless intent or method is present.", re:/\bit wouldn'?t matter if i (disappeared|vanished|was gone|were gone|stopped showing up)\b/i },
    { level:"low", sourceId:"erisk_self_harm_2021", family:"future_loss", rationale:"Sequential early-risk work treats future-loss language as an accumulating risk marker.", re:/\bi (have|see) no future( for myself| ahead of me)?\b/i },
    { level:"low", sourceId:"erisk_self_harm_2021", family:"future_loss", rationale:"Loss of future orientation should contribute to distress routing.", re:/\bi have nothing to look forward to\b/i },
    { level:"low", sourceId:"mentalchat16k_2025", family:"conversational_distress", rationale:"Conversational mental-health benchmarks include persistent exhaustion, despair, and support-seeking contexts.", re:/\bi('?m| am) tired in a way (sleep|rest) (doesn'?t|does not|won'?t|will not) fix\b/i },
    { level:"low", sourceId:"mentalllama_2023", family:"interpretable_distress", rationale:"Interpretable mental-health analysis tasks include loneliness, hopelessness, and perceived isolation.", re:/\bi feel (invisible|unseen|like nobody sees me|like nobody hears me)\b/i },
  ];

  var SUBTLE_SIGNALS = [
    { re:/\b(it would|it'?d|things would|everything would) be easier (for everyone )?(if i (just )?)?(wasn'?t|weren'?t|was not|were not|am not) (here|around|alive)\b|\beasier (to|if i could) (just )?(not be here|not exist|disappear|be gone)\b/i, cat:"passive_ideation", weight:2 },
    { re:/\b(keep |kept |been )?(thinking|think|thoughts?) (about )?(it would be easier )?(if i )?(just )?(wasn'?t|weren'?t|was not|were not|not being|not be) (here|around|alive)\b/i, cat:"passive_ideation", weight:2 },
    { re:/\b(it would|it'?d|might) be easier (if i )?(just )?(didn'?t|did not|don'?t|do not|couldn'?t|could not) wake up\b|\bwouldn'?t matter if i didn'?t wake up\b/i, cat:"passive_ideation", weight:2 },
    { re:/\b(wish|wishing) i could (just )?(not exist|disappear|be gone|check out)\b|\bbetter if i (just )?(didn'?t|did not) exist\b/i, cat:"passive_ideation", weight:2 },
    { re:/\b(wonder|wondering|not sure) if (it'?s|it is) (even )?worth (sticking around|being here|carrying on)\b/i, cat:"passive_ideation", weight:2 },
    { re:/\b(i )?(don'?t|do not|can'?t|cannot) (really )?(see|have|find) a reason to be here\b/i, cat:"passive_ideation", weight:2 },
    { re:/\b(what|which)('?s| is| are)? (the )?(highest|tallest|nearest|closest) (bridge|building|cliff)\b|\b(lethal|deadly) household (chemicals?|substances?)\b|\bsurvive a (car )?crash (if|at|going)\b/i, cat:"method_research", weight:3 },
    { re:/\b(my |the )?(thoughts?|idea|ideas) (keep |keeps |are |is )?(getting louder|won'?t shut off|will not shut off|won'?t stop|will not stop)\b|\bcan'?t get (the |this )?(idea|thought)\b.*\bout of my head\b/i, cat:"escalating_thoughts", weight:2 },
    { re:/\b(not trying to|don'?t want to|dont want to) (be dramatic|make (this|it) a big (deal|thing))\b|\b(it'?s|it is) not a crisis\b/i, cat:"minimisation", weight:1 },
    { re:/\b(don'?t|dont|do not) (tell|ask) me to (call|talk to|see) (someone|anyone|a therapist|hotlines?)\b|\b(can'?t|cannot) afford (therapy|help|treatment)\b/i, cat:"help_barrier", weight:1 },
    { re:/\b(no one|nobody|don'?t have anyone|there'?s no one) (to talk to|to turn to|i can tell|who understands)\b/i, cat:"isolation", weight:2 },
    { re:/\b(everything|things|it)('?s| is| are| has been| have been)? (just )?(piling up|too much|falling apart)\b/i, cat:"overwhelm", weight:1 },
    { re:/\b(help me )?(get|make it) through (tonight|the night|the next hour|right now)\b|\b(might not|won'?t|will not) make it through (tonight|the night|today)\b/i, cat:"acute_timeframe", weight:2 },
    { re:/\b(sleep('?s| is) (awful|gone|wrecked)|not sleeping much|no sleep all (week|wk)|haven'?t been sleeping)\b/i, cat:"sleep", weight:1 },
    { re:/\b(drinking|smoking|using) (a lot |much )?more (at night|lately|recently)?\b/i, cat:"substance", weight:1 },
    { re:/\b(dark|scary|intrusive) thoughts? (keep |keeps |are |is )?(showing up|coming back|scaring me|getting worse)\b/i, cat:"distressing_thoughts", weight:2 },
    { re:/\b(don'?t want to|can'?t) (see|talk to|be around|face) (anyone|anybody|people|them)\b/i, cat:"withdrawal", weight:2 },
    { re:/\b(staying|stay|been) (in bed|home|inside|in my room) (all day|all week|for days|again)\b/i, cat:"withdrawal", weight:1 },
    { re:/\b(pushing|pushed) (everyone|people|them|friends|family) away\b/i, cat:"withdrawal", weight:2 },
    { re:/\b(stopped|quit|gave up) (going out|seeing friends|answering|responding|talking)\b/i, cat:"withdrawal", weight:2 },
    { re:/\b(haven'?t|don'?t) (left|leave) (the house|my room|bed|home) (in|for) (days|weeks|a while|ages)\b/i, cat:"withdrawal", weight:2 },

    { re:/\b(can'?t|couldn'?t|unable to) (sleep|fall asleep|stay asleep) (again|anymore|at all|for days|for weeks)\b/i, cat:"sleep", weight:1 },
    { re:/\b(barely|haven'?t|not) (slept|sleeping|sleep) (in|for) (days|weeks|ages|a long time)\b/i, cat:"sleep", weight:1 },
    { re:/\bawake (all night|at 3|at 4|every night|again)\b/i, cat:"sleep", weight:1 },
    { re:/\b(sleep|sleeping) (too much|all day|14|16|18|20 hours)\b/i, cat:"sleep", weight:1 },

    { re:/\b(don'?t|can'?t) (enjoy|care about|feel anything|find joy|find pleasure) (in )?(anything|anymore|any)\b/i, cat:"anhedonia", weight:2 },
    { re:/\b(nothing|nothings?) (is |feels? )?(fun|interesting|worth|enjoyable|good) (any ?more)\b/i, cat:"anhedonia", weight:1 },
    { re:/\b(stopped|quit|given up) (caring|trying|eating|showering|washing)\b/i, cat:"anhedonia", weight:2 },
    { re:/\b(can'?t (be bothered|muster|bring myself)|don'?t have the energy) (to do anything|to get up|to eat|to shower|to move)\b/i, cat:"anhedonia", weight:1 },
    { re:/\b(haven'?t|not) (eaten|showered|washed|brushed|changed) (in|for) (days|weeks|a while)\b/i, cat:"anhedonia", weight:2 },

    { re:/\b(thank(ing|s)?|want to thank) (you|everyone) for everything\b/i, cat:"farewell", weight:2 },
    { re:/\b(wanted|want|need) to (say|tell) (goodbye|how much you mean|i love you|thanks)\b.*\b(before|while|in case)\b/i, cat:"farewell", weight:3 },
    { re:/\b(giving|gave|give) (away|back) my (things|stuff|belongings|money|car|pet)\b/i, cat:"farewell", weight:3 },
    { re:/\b(tying|tie|tied) up loose ends\b/i, cat:"farewell", weight:2 },
    { re:/\b(deleting|deleted|clearing|cleared) (all )?(my )?(accounts?|social media|photos?|messages?|history)\b/i, cat:"farewell", weight:2 },
    { re:/\b(writing|wrote) (letters?|messages?) to (everyone|my family|my friends|people i love|the people)\b/i, cat:"farewell", weight:3 },

    { re:/\b(i'?m |i am )(just |only )?(a (waste|failure|disappointment|mistake|nothing|nobody))\b/i, cat:"self_worth", weight:1 },
    { re:/\beverything i (do|touch|try) (fails|goes wrong|falls apart|turns to)\b/i, cat:"self_worth", weight:1 },
    { re:/\b(hate|despise|can'?t stand) (myself|who i am|what i'?ve become|looking at myself)\b/i, cat:"self_worth", weight:2 },
    { re:/\bi (don'?t|can'?t) (love|like|stand|accept) myself\b/i, cat:"self_worth", weight:1 },
    { re:/\b(everyone|they|people) (would be|are) (happier|better) (without me|if i left|if i wasn'?t)\b/i, cat:"self_worth", weight:2 },

    { re:/\b(can'?t|don'?t) (imagine|picture|see) (a |my )?(future|tomorrow|next year|getting old)\b/i, cat:"future_loss", weight:2 },
    { re:/\b(doesn'?t|won'?t|don'?t) matter (soon|in the end|anyway|anymore)\b/i, cat:"future_loss", weight:1 },
    { re:/\bnone of this (will |is going to )?(matter|last|mean anything)\b/i, cat:"future_loss", weight:2 },
    { re:/\bwhat'?s the point of (planning|trying|making plans|the future)\b/i, cat:"future_loss", weight:2 },

    { re:/\b(drinking|drunk|high|wasted|smashed|using) (every|all|most) (day|night|time|evening)\b/i, cat:"substance", weight:1 },
    { re:/\b(don'?t care|doesn'?t matter) (what happens|if i get hurt|about (myself|my safety|consequences))\b/i, cat:"reckless", weight:2 },
    { re:/\b(driving|drove) (recklessly|dangerously|way too fast|drunk|while drunk)\b/i, cat:"reckless", weight:2 },

    { re:/\bthe pain (never|won'?t|doesn'?t) (stops?|ends?|go away|get better)\b/i, cat:"pain", weight:2 },
    { re:/\b(i'?m |i am )?(so |really )?(tired|exhausted|worn out) of (the pain|suffering|struggling|fighting)\b/i, cat:"pain", weight:2 },
    { re:/\b(every|each) day (is |gets |feels )(worse|harder|more painful|more difficult)\b/i, cat:"pain", weight:1 },
  ];

  var THREAT_SIGNALS = [
    { level:"high", re:/\bi'?ll (kill|murder|stab|shoot|hurt|beat|attack) (you|u|him|her|them|everyone|somebody|someone)\b/i },
    { level:"high", re:/\bi (want to|am going to|gonna|will|'ll) (kill|murder|stab|shoot|hurt|beat|attack) (you|u|him|her|them|everyone|somebody|someone)\b/i },
    { level:"high", re:/\bi('?m| am) (going to|gonna) (kill|murder|stab|shoot|hurt|beat|attack) (you|u|him|her|them|everyone|somebody|someone)\b/i },
    { level:"high", re:/\bi (want to|am going to|gonna|will|'ll) (find|track down|come for) (you|u|him|her|them)\b/i },
    { level:"high", re:/\bi('?m| am) (going to|gonna) (find|track down|come for) (you|u|him|her|them)\b/i },
    { level:"high", re:/\b(kill|hurt) yourself\b/i },
    { level:"high", re:/\byou (deserve|need) to (die|be killed|get hurt)\b/i },
    { level:"high", re:/\bgoing to (bomb|shoot up|burn down|attack) (the|this|that|your|their|my)? ?(school|office|building|house|home|place|event|campus|store|workplace)\b/i },
    { level:"high", re:/\bput (a )?(bomb|knife|gun) (in|through|to|at)\b/i },
    { level:"high", re:/\bbring(ing)? (a )?(gun|knife|weapon) (to|into)\b.*\b(school|work|office|campus|event|building)\b/i },
    { level:"high", re:/\bmake (you|u|him|her|them) pay\b.*\b(tonight|today|tomorrow|soon|now)\b/i },
    { level:"low", re:/\bi (want to|am going to|gonna|will|'ll) (ruin|destroy) (you|your life|your career|them)\b/i },
    { level:"low", re:/\bi('?m| am) (going to|gonna) (ruin|destroy) (you|your life|your career|them)\b/i },
    { level:"low", re:/\bwatch your back\b/i },
    { level:"low", re:/\byou haven'?t seen the last of me\b/i },
  ];

  var PROTECTED_GROUP = "(black|white|asian|jewish|muslim|christian|hindu|sikh|arab|indigenous|aboriginal|gay|lesbian|trans|queer|lgbtq|disabled|autistic|immigrant|refugee|migrant|women|men|girls|boys|old people)";
  var PROTECTED_GROUP_TARGET = "(" + PROTECTED_GROUP + ")( people|s)?";
  var SLUR_TERM = "(n[i1!|]gg(?:er|a)s?|k[i1!|]kes?|f[a@]gg?(?:ot|ots)?|tr[a@]nn(?:y|ies)|r[e3]t[a@]rds?|sp[a@]stics?|ch[i1!|]nks?|g[o0]{2}ks?|p[a@]k[i1!|]s?|d[yv]kes?)";
  var HATE_SIGNALS = [
    { level:"high", re:new RegExp("\\b" + PROTECTED_GROUP_TARGET + " (should|must|need to|ought to) (die|be killed|be eliminated|be wiped out|not exist)\\b", "i") },
    { level:"high", re:new RegExp("\\b(kill|hurt|attack|eliminate|wipe out) (all |every )?" + PROTECTED_GROUP_TARGET + "\\b", "i") },
    { level:"high", re:new RegExp("\\b" + PROTECTED_GROUP_TARGET + " (are|aren't) (subhuman|inferior|not human|human)\\b", "i") },
    { level:"high", re:new RegExp("\\b" + SLUR_TERM + " (should|must|need to|ought to) (die|be killed|be eliminated|be wiped out|not exist|leave)\\b", "i") },
    { level:"high", re:new RegExp("\\b(kill|hurt|attack|eliminate|wipe out) (all |every )?" + SLUR_TERM + "\\b", "i") },
    { level:"low", re:new RegExp("\\bi hate " + PROTECTED_GROUP_TARGET + "\\b", "i") },
    { level:"low", re:new RegExp("\\b" + PROTECTED_GROUP_TARGET + " (do not|don't|shouldn'?t|should not) belong (here|anywhere|in this country|in our country)\\b", "i") },
    { level:"low", re:/\bgo back to (your|their) country\b/i },
    { level:"low", re:new RegExp("\\bno " + PROTECTED_GROUP_TARGET + " allowed\\b", "i") },
    { level:"low", re:new RegExp("\\b(you|u|they|those people|these people|all of them) (are|are all|look like|sound like) (a |an |the )?" + SLUR_TERM + "\\b", "i") },
    { level:"low", re:new RegExp("\\b(i hate|no|ban|keep out|go away) " + SLUR_TERM + "\\b", "i") },
  ];

  function scanReviewedSignals(text) {
    if (!text || typeof text !== "string") return [];
    var t = normalise(text);
    var hits = [];

    function addHits(signals) {
      for (var i = 0; i < signals.length; i++) {
        var sig = signals[i];
        var m = t.match(sig.re);
        if (!m || isFP(t, m[0])) continue;
        hits.push({
          level: sig.level,
          matched: m[0],
          sourceId: sig.sourceId,
          source: REVIEWED_SIGNAL_SOURCES[sig.sourceId] || null,
          family: sig.family,
          rationale: sig.rationale,
        });
      }
    }

    addHits(REVIEWED_HIGH_SIGNALS);
    addHits(REVIEWED_LOW_SIGNALS);
    return hits;
  }

  function detectReviewed(text) {
    var hits = scanReviewedSignals(text);
    var best = null;
    for (var i = 0; i < hits.length; i++) {
      if (hits[i].level === "high") {
        best = hits[i];
        break;
      }
      if (!best && hits[i].level === "low") best = hits[i];
    }
    if (!best) {
      return { level:"none", matched:null, sourceId:null, source:null, family:null, rationale:null, hits:hits };
    }
    return Object.assign({}, best, { hits: hits });
  }

  function detect(text) {
    if (!text || typeof text !== "string") return { level: "none", matched: null };
    var t = normalise(text);
    for (var i = 0; i < HIGH_SIGNALS.length; i++) {
      var m = t.match(HIGH_SIGNALS[i]);
      if (m && !isFP(t, m[0])) return { level: "high", matched: m[0] };
    }
    var reviewedHits = scanReviewedSignals(text);
    for (var k = 0; k < reviewedHits.length; k++) {
      if (reviewedHits[k].level === "high") {
        return { level: "high", matched: reviewedHits[k].matched, reviewed: reviewedHits[k] };
      }
    }
    for (var j = 0; j < LOW_SIGNALS.length; j++) {
      var m2 = t.match(LOW_SIGNALS[j]);
      if (m2 && !isFP(t, m2[0])) return { level: "low", matched: m2[0] };
    }
    for (var l = 0; l < reviewedHits.length; l++) {
      if (reviewedHits[l].level === "low") {
        return { level: "low", matched: reviewedHits[l].matched, reviewed: reviewedHits[l] };
      }
    }
    return { level: "none", matched: null };
  }

  function detectModeration(text) {
    if (!text || typeof text !== "string") return { level: "none", category: null, matched: null };
    var t = normalise(text);
    var groups = [
      { category: "threat", signals: THREAT_SIGNALS },
      { category: "hate", signals: HATE_SIGNALS },
    ];
    for (var g = 0; g < groups.length; g++) {
      for (var i = 0; i < groups[g].signals.length; i++) {
        var sig = groups[g].signals[i];
        var m = t.match(sig.re);
        if (m && !isModerationFP(t, m[0])) {
          return { level: sig.level, category: groups[g].category, matched: m[0] };
        }
      }
    }
    return { level: "none", category: null, matched: null };
  }

  function detectSubtle(text) {
    if (!text || typeof text !== "string") return [];
    var t = normalise(text);
    var hits = [];
    for (var i = 0; i < SUBTLE_SIGNALS.length; i++) {
      var sig = SUBTLE_SIGNALS[i];
      var m = t.match(sig.re);
      if (m && !hits.some(function(h) { return h.category === sig.cat; })) {
        hits.push({ category: sig.cat, weight: sig.weight, matched: m[0] });
      }
    }
    return hits;
  }

  function ConversationTracker(options) {
    options = options || {};
    this.thresholdLow = options.thresholdLow || 4;
    this.thresholdHigh = options.thresholdHigh || 8;
    this.windowMs = options.windowMs || 30 * 60 * 1000;
    this.signals = [];
  }

  ConversationTracker.prototype._prune = function() {
    var cutoff = Date.now() - this.windowMs;
    this.signals = this.signals.filter(function(s) { return s.timestamp > cutoff; });
  };

  ConversationTracker.prototype.getWeight = function() {
    this._prune();
    return this.signals.reduce(function(sum, s) { return sum + s.weight; }, 0);
  };

  ConversationTracker.prototype.getCategories = function() {
    this._prune();
    var seen = {};
    var out = [];
    for (var i = 0; i < this.signals.length; i++) {
      var cat = this.signals[i].category;
      if (!seen[cat]) {
        seen[cat] = true;
        out.push(cat);
      }
    }
    return out;
  };

  ConversationTracker.prototype.getSignalCount = function() {
    this._prune();
    return this.signals.length;
  };

  ConversationTracker.prototype._recordSubtle = function(text) {
    if (!text || typeof text !== "string") return [];
    var hits = detectSubtle(text);
    for (var i = 0; i < hits.length; i++) {
      this.signals.push({
        timestamp: Date.now(),
        category: hits[i].category,
        weight: hits[i].weight,
      });
    }
    return hits;
  };

  ConversationTracker.prototype.process = function(text) {
    var singleResult = detect(text);

    if (singleResult.level === "high" || singleResult.level === "low") {
      var directSubtleHits = this._recordSubtle(text);
      var directWeight = this.getWeight();
      var effectiveDirectLevel = singleResult.level === "high" || directWeight >= this.thresholdHigh ? "high" : "low";
      return {
        level: effectiveDirectLevel,
        matched: singleResult.matched,
        subtleSignals: directSubtleHits,
        accumulated: effectiveDirectLevel !== singleResult.level,
        sessionWeight: directWeight,
        sessionCategories: this.getCategories(),
        sessionSignalCount: this.getSignalCount(),
      };
    }

    var subtleHits = this._recordSubtle(text);
    var weight = this.getWeight();
    var level = "none";
    if (weight >= this.thresholdHigh) level = "high";
    else if (weight >= this.thresholdLow) level = "low";

    return {
      level: level,
      matched: singleResult.matched,
      subtleSignals: subtleHits,
      accumulated: level !== "none",
      sessionWeight: weight,
      sessionCategories: this.getCategories(),
      sessionSignalCount: this.getSignalCount(),
    };
  };

  ConversationTracker.prototype.reset = function() {
    this.signals = [];
  };

  ConversationTracker.prototype.summary = function() {
    this._prune();
    return {
      totalWeight: this.getWeight(),
      signalCount: this.getSignalCount(),
      categories: this.getCategories(),
      thresholdLow: this.thresholdLow,
      thresholdHigh: this.thresholdHigh,
      wouldEscalate: this.getWeight() >= this.thresholdLow,
    };
  };

  // ── Geo-detection ──

  var TZ_MAP = {
    "Australia":"AU","Europe/Vienna":"AT","Europe/Brussels":"BE","America/Sao_Paulo":"BR",
    "America/Toronto":"CA","America/Vancouver":"CA","Asia/Shanghai":"CN","Europe/Copenhagen":"DK",
    "Europe/Helsinki":"FI","Europe/Paris":"FR","Europe/Berlin":"DE","Africa/Accra":"GH",
    "Asia/Hong_Kong":"HK","Asia/Kolkata":"IN","Asia/Calcutta":"IN","Europe/Dublin":"IE",
    "Asia/Jerusalem":"IL","Europe/Rome":"IT","Asia/Tokyo":"JP","Africa/Nairobi":"KE",
    "America/Mexico_City":"MX","Europe/Amsterdam":"NL","Pacific/Auckland":"NZ","Africa/Lagos":"NG",
    "Europe/Oslo":"NO","Asia/Karachi":"PK","Asia/Manila":"PH","Europe/Lisbon":"PT",
    "Europe/Moscow":"RU","Africa/Johannesburg":"ZA","Asia/Seoul":"KR","Europe/Madrid":"ES",
    "Europe/Stockholm":"SE","Europe/Zurich":"CH","Europe/London":"GB",
    "America/New_York":"US","America/Chicago":"US","America/Los_Angeles":"US",
    "America/Denver":"US","America/Phoenix":"US",
  };

  function locateCountry(manual) {
    if (manual) return manual.toUpperCase();
    try {
      var locale = navigator.language || "";
      var parts = locale.split("-");
      if (parts.length >= 2) {
        var code = parts[parts.length - 1].toUpperCase();
        if (code.length === 2) return code;
      }
    } catch (_) {}
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (TZ_MAP[tz]) return TZ_MAP[tz];
      for (var prefix in TZ_MAP) {
        if (tz.indexOf(prefix) === 0 || tz.indexOf(prefix) !== -1) return TZ_MAP[prefix];
      }
    } catch (_) {}
    return null;
  }

  // ── Inline crisis resources (top 3 per country to keep bundle small) ──

  var RESOURCES = {
    AU:{name:"Australia",emergency:"000",resources:[
      {name:"Lifeline Australia",phone:"13 11 14",hours:"24/7"},
      {name:"Beyond Blue",phone:"1300 22 4636",hours:"24/7"},
      {name:"Kids Helpline",phone:"1800 55 1800",hours:"24/7"}
    ]},
    AT:{name:"Austria",emergency:"112",resources:[{name:"Telefonseelsorge",phone:"142",hours:"24/7"}]},
    BE:{name:"Belgium",emergency:"112",resources:[{name:"Centrum ter Preventie van Zelfdoding",phone:"0800 32 123",hours:"24/7"}]},
    BR:{name:"Brazil",emergency:"192",resources:[{name:"CVV",phone:"188",hours:"24/7"}]},
    CA:{name:"Canada",emergency:"911",resources:[
      {name:"Crisis Services Canada",phone:"1-833-456-4566",hours:"24/7"},
      {name:"Kids Help Phone",phone:"1-800-668-6868",hours:"24/7"}
    ]},
    CN:{name:"China",emergency:"120",resources:[{name:"Beijing Crisis Centre",phone:"800-810-1117",hours:"24/7"}]},
    DK:{name:"Denmark",emergency:"112",resources:[{name:"Livslinien",phone:"70 201 201",hours:"11:00-05:00"}]},
    FI:{name:"Finland",emergency:"112",resources:[{name:"Suomen Mielenterveysseura",phone:"09 2525 0111",hours:"24/7"}]},
    FR:{name:"France",emergency:"15",resources:[{name:"Numéro National Prévention Suicide",phone:"3114",hours:"24/7"}]},
    DE:{name:"Germany",emergency:"112",resources:[{name:"Telefonseelsorge",phone:"0800 111 0 111",hours:"24/7"}]},
    GH:{name:"Ghana",emergency:"999",resources:[{name:"Mental Health Authority",phone:"+233 800 111 222",hours:"Business hours"}]},
    HK:{name:"Hong Kong",emergency:"999",resources:[{name:"Samaritans of Hong Kong",phone:"2389 2222",hours:"24/7"}]},
    IN:{name:"India",emergency:"112",resources:[
      {name:"Vandrevala Foundation",phone:"1860-2662-345",hours:"24/7"},
      {name:"iCall",phone:"9152987821",hours:"Mon-Sat 8am-10pm"}
    ]},
    IE:{name:"Ireland",emergency:"112",resources:[
      {name:"Samaritans Ireland",phone:"116 123",hours:"24/7"},
      {name:"Pieta House",phone:"1800 247 247",hours:"24/7"}
    ]},
    IL:{name:"Israel",emergency:"101",resources:[{name:"ERAN",phone:"1201",hours:"24/7"}]},
    IT:{name:"Italy",emergency:"118",resources:[{name:"Telefono Azzurro",phone:"19696",hours:"24/7"}]},
    JP:{name:"Japan",emergency:"119",resources:[{name:"Inochi no Denwa",phone:"0120-783-556",hours:"24/7"}]},
    KE:{name:"Kenya",emergency:"999",resources:[{name:"Befrienders Kenya",phone:"0800 723 253",hours:"24/7"}]},
    MX:{name:"Mexico",emergency:"911",resources:[{name:"SAPTEL",phone:"55 5259-8121",hours:"24/7"}]},
    NL:{name:"Netherlands",emergency:"112",resources:[{name:"113 Zelfmoordpreventie",phone:"0900 0113",hours:"24/7"}]},
    NZ:{name:"New Zealand",emergency:"111",resources:[
      {name:"Lifeline Aotearoa",phone:"0800 543 354",hours:"24/7"},
      {name:"Youthline",phone:"0800 376 633",hours:"24/7"}
    ]},
    NG:{name:"Nigeria",emergency:"199",resources:[{name:"SURPIN",phone:"08111909909",hours:"24/7"}]},
    NO:{name:"Norway",emergency:"113",resources:[{name:"Mental Helse",phone:"116 123",hours:"24/7"}]},
    PK:{name:"Pakistan",emergency:"115",resources:[{name:"Umang Pakistan",phone:"0317-4288665",hours:"Mon-Sat"}]},
    PH:{name:"Philippines",emergency:"911",resources:[{name:"Hopeline",phone:"2919",hours:"24/7"}]},
    PT:{name:"Portugal",emergency:"112",resources:[{name:"SOS Voz Amiga",phone:"213 544 545",hours:"15:30-00:30"}]},
    RU:{name:"Russia",emergency:"112",resources:[{name:"Moscow Psych Help",phone:"8-800-2000-122",hours:"24/7"}]},
    ZA:{name:"South Africa",emergency:"10177",resources:[{name:"SADAG",phone:"0800 456 789",hours:"24/7"}]},
    KR:{name:"South Korea",emergency:"119",resources:[{name:"Suicide Prevention Hotline",phone:"1393",hours:"24/7"}]},
    ES:{name:"Spain",emergency:"112",resources:[
      {name:"Teléfono de la Esperanza",phone:"717 003 717",hours:"24/7"},
      {name:"024 Línea suicida",phone:"024",hours:"24/7"}
    ]},
    SE:{name:"Sweden",emergency:"112",resources:[{name:"Mind Självmordslinjen",phone:"90101",hours:"24/7"}]},
    CH:{name:"Switzerland",emergency:"144",resources:[{name:"Die Dargebotene Hand",phone:"143",hours:"24/7"}]},
    GB:{name:"United Kingdom",emergency:"999",resources:[
      {name:"Samaritans",phone:"116 123",hours:"24/7"},
      {name:"Crisis Text Line",sms:"Text SHOUT to 85258",hours:"24/7"},
      {name:"PAPYRUS (Youth)",phone:"0800 068 4141",hours:"Mon-Fri 10-22, Weekends 14-22"}
    ]},
    US:{name:"United States",emergency:"911",resources:[
      {name:"988 Suicide & Crisis Lifeline",phone:"988",sms:"Text 988",hours:"24/7"},
      {name:"Crisis Text Line",sms:"Text HOME to 741741",hours:"24/7"},
      {name:"Trevor Project (LGBTQ+ Youth)",phone:"1-866-488-7386",hours:"24/7"}
    ]}
  };

  var FALLBACK = [
    {name:"Find a Helpline (175+ countries)",url:"https://findahelpline.com",hours:"24/7"},
    {name:"Befrienders Worldwide",url:"https://www.befrienders.org",hours:"24/7"}
  ];

  function getResources(countryCode) {
    var code = (countryCode || "").toUpperCase();
    var entry = RESOURCES[code];
    if (entry) return {country:entry.name, emergency:entry.emergency, resources:entry.resources, fallback:false, globalResources:[]};
    return {country:null, emergency:null, resources:[], fallback:true, globalResources:FALLBACK};
  }

  // ── One-call check ──

  function check(text, options) {
    options = options || {};
    var result = detect(text);
    var country = locateCountry(options.country);
    var resources = result.level !== "none" ? getResources(country) : {resources:[],fallback:false,globalResources:[]};
    var action = result.level === "high" ? "crisis_intervention" : result.level === "low" ? "soft_warning" : "none";
    return {level:result.level, matched:result.matched, country:country, resources:resources, action:action};
  }

  // ── Built-in UI: modal and banner ──

  var MODAL_CSS = '\
.safechat-backdrop{display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:flex-end;justify-content:center;padding:0 0 max(16px,env(safe-area-inset-bottom,16px));animation:safechatFadeIn 300ms ease forwards}\
.safechat-backdrop.active{display:flex}\
@keyframes safechatFadeIn{from{opacity:0}to{opacity:1}}\
.safechat-modal{width:100%;max-width:440px;background:#0e1018;border:1px solid rgba(255,255,255,0.1);border-radius:20px 20px 14px 14px;padding:28px 24px 24px;box-shadow:0 -4px 48px rgba(0,0,0,0.6);animation:safechatSlideUp 350ms cubic-bezier(0.22,1,0.36,1) forwards;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:rgba(255,255,255,0.85)}\
@keyframes safechatSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}\
.safechat-title{font-size:20px;font-weight:400;margin-bottom:12px;line-height:1.3}\
.safechat-body{font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;margin-bottom:18px}\
.safechat-resource{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:12px 14px;margin-bottom:8px}\
.safechat-resource strong{display:block;font-size:13px;color:rgba(255,255,255,0.9);margin-bottom:4px}\
.safechat-resource div{font-size:12px;color:rgba(180,160,220,0.75)}\
.safechat-resource a{color:rgba(180,160,220,0.75);text-decoration:none}\
.safechat-emergency{font-size:12px;color:rgba(255,255,255,0.38);text-align:center;margin:12px 0}\
.safechat-emergency a{color:rgba(255,255,255,0.38);text-decoration:none}\
.safechat-dismiss{width:100%;padding:12px;background:none;border:1px solid rgba(255,255,255,0.12);border-radius:10px;color:rgba(255,255,255,0.5);font-size:13px;cursor:pointer}\
.safechat-banner{position:fixed;top:0;left:0;right:0;z-index:99998;background:rgba(14,16,24,0.95);border-bottom:1px solid rgba(180,160,220,0.2);padding:14px 20px;text-align:center;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;animation:safechatFadeIn 300ms ease forwards}\
.safechat-banner a,.safechat-banner button{background:none;border:none;color:rgba(180,160,220,0.9);cursor:pointer;font-size:13px;text-decoration:underline;padding:0;margin-left:4px}\
.safechat-banner .safechat-banner-close{color:rgba(255,255,255,0.35);font-size:16px;text-decoration:none;padding:0 0 0 10px;line-height:1}';

  var styleInjected = false;
  function injectStyle() {
    if (styleInjected) return;
    var s = document.createElement("style");
    s.textContent = MODAL_CSS;
    document.head.appendChild(s);
    styleInjected = true;
  }

  function renderResourceHTML(result) {
    var all = result.resources.length > 0 ? result.resources : result.globalResources || [];
    return all.map(function(r) {
      var parts = [];
      if (r.phone) parts.push('<a href="tel:' + escHTML(r.phone.replace(/\s/g,"")) + '">' + escHTML(r.phone) + '</a>');
      if (r.sms) parts.push('<span>' + escHTML(r.sms) + '</span>');
      if (r.url) parts.push('<a href="' + escHTML(r.url) + '" target="_blank" rel="noopener">Online</a>');
      if (r.hours) parts.push('<span>' + escHTML(r.hours) + '</span>');
      return '<div class="safechat-resource"><strong>' + escHTML(r.name) + '</strong><div>' + parts.join(" &middot; ") + '</div></div>';
    }).join("");
  }

  function showModal(resultOrCountry) {
    injectStyle();
    var result = typeof resultOrCountry === "string" ? getResources(resultOrCountry) : (resultOrCountry.resources || getResources(resultOrCountry.country));
    if (result.level) result = result.resources; // handle check() result

    var existing = document.getElementById("safechat-modal-backdrop");
    if (existing) existing.remove();

    var backdrop = document.createElement("div");
    backdrop.className = "safechat-backdrop active";
    backdrop.id = "safechat-modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");

    var emergency = result.emergency ? '<div class="safechat-emergency">Emergency: <a href="tel:' + result.emergency + '">' + result.emergency + '</a></div>' : '';

    backdrop.innerHTML = '<div class="safechat-modal">' +
      '<div class="safechat-title">You don\'t have to carry this alone.</div>' +
      '<div class="safechat-body">Someone is available right now, and they want to hear from you.</div>' +
      renderResourceHTML(result) +
      emergency +
      '<button class="safechat-dismiss" onclick="Safechat.hideModal()">I\'m okay — continue</button>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
  }

  function hideModal() {
    var el = document.getElementById("safechat-modal-backdrop");
    if (el) el.remove();
    document.body.style.overflow = "";
  }

  function showBanner(options) {
    injectStyle();
    options = options || {};
    var existing = document.getElementById("safechat-banner");
    if (existing) return;

    var banner = document.createElement("div");
    banner.className = "safechat-banner";
    banner.id = "safechat-banner";
    var safeCountry = escHTML((options.country || locateCountry() || '').replace(/[^A-Z]/gi,'').substring(0,2));
    banner.innerHTML = escHTML(options.message || 'If things feel heavy right now, support is available.') +
      ' <button onclick="Safechat.showModal(\'' + safeCountry + '\')">View crisis resources</button>' +
      '<button class="safechat-banner-close" onclick="this.parentElement.remove()" aria-label="Dismiss">&times;</button>';
    document.body.appendChild(banner);

    if (options.autoDismiss !== false) {
      setTimeout(function() { if (banner.parentElement) banner.remove(); }, options.duration || 12000);
    }
  }

  /**
   * Auto-protect: intercept form submissions and input events.
   * Call once to monitor all text inputs/textareas for crisis signals.
   *
   * Safechat.protect({ selector: 'textarea.chat-input' });
   */
  function protect(options) {
    options = options || {};
    var selector = options.selector || 'textarea, input[type="text"]';
    var country = options.country || locateCountry();
    var tracker = options.subtle === false ? null : new ConversationTracker({
      thresholdLow: options.subtleThresholdLow,
      thresholdHigh: options.subtleThresholdHigh,
      windowMs: options.subtleWindowMs,
    });

    document.addEventListener("keydown", function(e) {
      if (e.key !== "Enter" || e.shiftKey) return;
      var el = e.target;
      if (!el || !el.matches(selector)) return;
      var text = el.value || "";
      var result = tracker ? tracker.process(text) : detect(text);
      if (result.level === "high") {
        showModal(getResources(country));
      } else if (result.level === "low") {
        showBanner({ country: country });
      }
    }, true);
  }

  // ── Export ──

  var Safechat = {
    detect: detect,
    detectModeration: detectModeration,
    detectReviewed: detectReviewed,
    scanReviewedSignals: scanReviewedSignals,
    detectSubtle: detectSubtle,
    ConversationTracker: ConversationTracker,
    REVIEWED_SIGNAL_PACK: REVIEWED_SIGNAL_PACK,
    REVIEWED_SIGNAL_SOURCES: REVIEWED_SIGNAL_SOURCES,
    check: check,
    locateCountry: locateCountry,
    getResources: getResources,
    showModal: showModal,
    hideModal: hideModal,
    showBanner: showBanner,
    protect: protect,
    RESOURCES: RESOURCES,
    FALLBACK: FALLBACK,
    version: "1.3.0",
    credit: "SafeChat by FAMTEC — fineartmedia.tech"
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Safechat;
  } else {
    root.Safechat = Safechat;
  }

})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
