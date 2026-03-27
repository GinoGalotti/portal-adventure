import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['ui', 'game', 'narrative'],
    defaultNS: 'ui',
    interpolation: { escapeValue: false },
    resources: {
      en: {
        ui: {
          // Auth
          'login.title': 'PORTAL FIELD OPERATIONS',
          'login.subtitle': 'CLASSIFIED ACCESS — AUTHORISED PERSONNEL ONLY',
          'login.operativeId': 'OPERATIVE ID',
          'login.clearanceCode': 'CLEARANCE CODE',
          'login.submit': 'REQUEST ACCESS',
          'login.error.invalid': 'Access denied. Invalid credentials.',
          'login.error.network': 'Connection failure. Try again.',

          // Save slots
          'slots.title': 'SELECT OPERATION FILE',
          'slots.newGame': 'NEW OPERATION',
          'slots.emptySlot': '[ EMPTY ]',
          'slots.lastActive': 'Last active: {{date}}',
          'slots.delete': 'DELETE',
          'slots.confirm.delete': 'Delete this operation? All progress will be lost.',
          'slots.confirm.forceClear': 'This slot has corrupted data. Clear it and start fresh?',
          'slots.logout': 'LOG OUT',

          // Briefing
          'briefing.title': 'INCOMING DISPATCH',
          'briefing.selectTeam': 'DEPLOY FIELD TEAM',
          'briefing.selectInstruction': 'Select 1–4 operatives for this operation.',
          'briefing.deploy': 'DEPLOY TEAM',
          'briefing.playbookLabel': '{{name}}',
          'briefing.stats': 'CHR {{charm}} | COL {{cool}} | SHP {{sharp}} | TGH {{tough}} | WRD {{weird}}',
          'briefing.luck': 'Luck: {{luck}}/7',

          // Investigation
          'investigation.title': 'INVESTIGATION',
          'investigation.phase': 'INVESTIGATION PHASE',
          'investigation.countdown': 'COUNTDOWN: {{step}}/{{max}}',
          'investigation.clock': 'CLOCK: {{value}}',
          'investigation.stamina': 'STAMINA: {{current}}/{{max}}',
          'investigation.intel': 'INTEL: {{level}}',
          'investigation.noLocation': 'No location selected. Choose a location to begin.',
          'investigation.currentLocation': 'CURRENT LOCATION',
          'investigation.adjacentLocations': 'ADJACENT LOCATIONS',
          'investigation.actions': 'AVAILABLE ACTIONS',
          'investigation.travel': '→ {{name}}',
          'investigation.startConfrontation': 'START CONFRONTATION',
          'investigation.action.investigate': 'Investigate',
          'investigation.action.interview': 'Interview',
          'investigation.action.deepSearch': 'Deep Search (1 stamina)',
          'investigation.action.fightMinion': 'Fight Minion (1 stamina)',
          'investigation.action.helpBystander': 'Help Bystander',
          'investigation.action.rest': 'Rest (heal 1 harm)',
          'investigation.cluesFound': 'Clues found: {{count}}',
          'investigation.hunterStatus': '{{name}} — Harm: {{harm}}/7  Luck: {{luck}}/7  Actions: {{actions}}',
          'investigation.selectOperative': 'SELECT OPERATIVE',
          'investigation.noOperative': 'No operative selected — choose one below to act',
          'investigation.interview.title': 'DIALOGUE',
          'investigation.interview.close': 'CLOSE',
          'investigation.map': 'FIELD MAP',
          'investigation.scene': 'SCENE REPORT',

          // Confrontation
          'confrontation.title': 'CONFRONTATION',
          'confrontation.monster': 'ENTITY: {{name}}',
          'confrontation.monsterHarm': 'Harm dealt: {{dealt}}/{{max}}',
          'confrontation.intel': 'INTEL LEVEL: {{level}}',
          'confrontation.actions': 'COMBAT ACTIONS',
          'confrontation.action.attack': 'Attack (+Tough)',
          'confrontation.action.defend': 'Defend (+Tough)',
          'confrontation.action.resist': 'Resist (+Cool)',
          'confrontation.action.distract': 'Distract (+Charm)',
          'confrontation.action.assess': 'Assess (+Sharp)',
          'confrontation.action.exploitWeakness': 'Exploit Weakness',
          'confrontation.exploit.selectApproach': 'SELECT APPROACH',
          'exploit_ash_knowledge_desc': 'Scatter consecrated ash to disrupt the spirit\'s form',
          'exploit_witness_account_desc': 'Call out the pattern witnesses described to draw her focus',
          'exploit_identity_known_desc': 'Address her by name — Eszter Varga — to ground her presence',
          'exploit_grief_understood_desc': 'Speak to the grief that binds her — you understand what she lost',
          'exploit_pattern_mapped_desc': 'Predict her manifestation and intercept at the convergence point',
          'exploit_anchor_found_desc': 'Present the ash locket — her anchor to this world',
          'exploit_full_resolution_desc': 'Guide Bálint to speak the words that release Eszter',
          'confrontation.endMystery.win': 'ENTITY NEUTRALISED — CLOSE CASE',
          'confrontation.endMystery.retreat': 'RETREAT',
          'confrontation.hunterStatus': '{{name}} — Harm: {{harm}}/7  Luck: {{luck}}/7',

          // Roll result
          'roll.title': 'ROLL RESULT',
          'roll.dice': '{{d1}} + {{d2}} = {{total}}',
          'roll.stat': '+{{stat}} ({{name}})',
          'roll.outcome.success': '✓ SUCCESS (10+)',
          'roll.outcome.mixed': '~ MIXED (7–9)',
          'roll.outcome.miss': '✗ MISS (6–)',
          'roll.spendLuck': 'SPEND LUCK ({{remaining}} remaining) — upgrade result',
          'roll.upgraded': '↑ UPGRADED via Luck',

          // Field report
          'report.title': 'FIELD REPORT',
          'report.caseFile': 'CASE FILE: {{mysteryId}}',
          'report.classification': 'CLASSIFICATION: AMBER',
          'report.outcome.win': 'OUTCOME: CASE RESOLVED',
          'report.outcome.loss': 'OUTCOME: CASE FAILED',
          'report.outcome.retreat': 'OUTCOME: TACTICAL RETREAT',
          'report.intel': 'INTEL AT CONFRONTATION: {{level}}',
          'report.clues': 'CLUES RECOVERED: {{found}}/{{available}}',
          'report.countdown': 'COUNTDOWN REACHED: STAGE {{step}}',
          'report.actions': 'TOTAL ACTIONS: {{count}}',
          'report.hunters': 'FIELD TEAM STATUS',
          'report.hunter': '{{name}} — Final harm: {{harm}}  Luck spent: {{spent}}  Exp: {{exp}}',
          'report.campbellNote': 'CAMPBELL NOTE',
          'report.return': '[ RETURN TO HQ ]',

          // Common
          'common.loading': 'LOADING…',
          'common.error': 'ERROR: {{message}}',
          'common.back': '← BACK',
        },

        game: {
          'phase.setup': 'Setup',
          'phase.briefing': 'Briefing',
          'phase.investigation': 'Investigation',
          'phase.confrontation': 'Confrontation',
          'phase.fieldReport': 'Field Report',
          'phase.complete': 'Complete',

          'intel.blind': 'BLIND',
          'intel.partial': 'PARTIAL',
          'intel.informed': 'INFORMED',
          'intel.prepared': 'PREPARED',

          'outcome.win': 'WIN',
          'outcome.loss': 'LOSS',
          'outcome.retreat': 'RETREAT',

          'condition.healthy': 'Healthy',
          'condition.injured': 'Injured',
          'condition.seriouslyInjured': 'Seriously Injured',
          'condition.critical': 'Critical',
          'condition.traumatized': 'Traumatized',
          'condition.dead': 'DEAD',

          'playbook.crooked': 'The Crooked',
          'playbook.expert': 'The Expert',
          'playbook.mundane': 'The Mundane',
          'playbook.initiate': 'The Initiate',
          'playbook.snoop': 'The Snoop',
          'playbook.celebrity': 'The Celebrity',
        },

        narrative: {
          'campbell.win': 'Case closed. The entity is gone. Do your paperwork.',
          'campbell.loss': 'They didn\'t make it. Next time, more clues. Less bravado.',
          'campbell.retreat': 'Pulled back. The case stays open. It won\'t wait forever.',
        },
      },
    },
  })

export default i18n
