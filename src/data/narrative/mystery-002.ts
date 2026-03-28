/**
 * Narrative overlay for mystery-002: "The Volunteer"
 *
 * Gordon Avery, 58, retired schoolteacher. Full cancer remission after a
 * Meridian BioSciences clinical trial. Unknown to Gordon, the trial implanted
 * a vitality displacement mechanism — he drains life from anyone in sustained
 * proximity. He is getting stronger every day. Everyone around him is dying.
 *
 * This is a purely presentational layer — engine actions are unchanged.
 * Scene elements map 1-to-1 to engine action types.
 */

import type {
  SceneElement,
  NpcDialogue,
  LocationNarrative,
} from './mystery-001'

// ─── ASCII Mini-map ──────────────────────────────────────────────────────────
//
// Location graph:
//   UNIVERSITY LAB → MERIDIAN OFFICE → MEDICAL CENTRE → FAMILY HOME → PARK
//
// [UNI]─[MER]
//         │
//       [MED]─[AVR]
//               │
//             [PRK]

export const MAP_ROWS = [
  '[UNI]─[MER]     ',
  '        │       ',
  '      [MED]─[AVR]',
  '              │ ',
  '            [PRK]',
]

export const MAP_TOKENS: Record<string, string> = {
  '[UNI]': 'loc-university-lab',
  '[MER]': 'loc-meridian-office',
  '[MED]': 'loc-medical-centre',
  '[AVR]': 'loc-family-home',
  '[PRK]': 'loc-park',
}

// ─── Location Narratives ─────────────────────────────────────────────────────

const NARRATIVES: LocationNarrative[] = [
  // ── Hargrove Medical Centre — Outpatient Wing ──────────────────────────────
  {
    locationId: 'loc-medical-centre',
    ambiance: 'Fluorescent corridors. Four beds in Ward C are empty now. Nobody talks about why.',
    scene: [
      { type: 'text', content: 'The outpatient wing hums with institutional quiet. Ward C is nearly empty — ' },
      { type: 'element', elementId: 'ward-beds' },
      { type: 'text', content: ' sit behind a partition, their occupants gone within the month. A ' },
      { type: 'element', elementId: 'ward-nurse' },
      { type: 'text', content: ' watches you approach, her hand resting on a manila folder she wasn\'t planning to share. The corridor smells of antiseptic and something faintly sweet, like wilting flowers. A ' },
      { type: 'element', elementId: 'patient-board' },
      { type: 'text', content: ' on the wall lists discharge dates, but four entries are marked only with a black line.' },
    ],
    elements: [
      {
        id: 'ward-beds',
        label: 'four beds with freshly stripped mattresses',
        hint: 'Review the ward records',
        actionType: 'investigate',
        response: {
          miss: 'You look through the ward records at the station, but a doctor appears and redirects you. "Those patients are no longer under our care." The phrasing is careful.',
          mixed: 'The records show four deaths in 28 days. All outpatient visitors or long-stay patients in beds adjacent to Treatment Bay 7 — Gordon Avery\'s bay. Organ failure, all four. No pathogen found.',
          success: 'Four deaths in 28 days. All in proximity to Treatment Bay 7. Organ failure — multiple systems, cascading, no pathogen, no toxin. The attending nurse has circled each proximity note in red. She knows. She just doesn\'t know what to call it.',
        },
      },
      {
        id: 'ward-nurse',
        label: 'nurse at the station',
        hint: 'She has been tracking this',
        actionType: 'interview',
        npcId: 'npc-ward-nurse',
      },
      {
        id: 'patient-board',
        label: 'patient board',
        hint: 'Check the discharge entries',
        hidden: true,
        actionType: 'investigate',
        response: {
          miss: 'Administrative shorthand. You scan the entries but the notation system is opaque without context.',
          mixed: 'Four black lines instead of discharge dates. All in the same 28-day window. All beds within ten metres of Bay 7.',
          success: 'Four black lines — deaths, not discharges. All within ten metres of Treatment Bay 7. Someone has written in pencil beneath the last entry: "same pattern?" The handwriting matches the nurse\'s notes.',
        },
      },
    ],
    npcs: [
      {
        npcId: 'npc-ward-nurse',
        name: 'Ward Nurse — Station C',
        description: 'She has been here for every shift. Dark circles under her eyes. The folder under her hand contains her own notes — not official ones.',
        options: [
          {
            id: 'q-deaths',
            question: '"What can you tell us about the four deaths?"',
            responses: {
              miss: '"I can\'t discuss patient records. You\'d need to speak to administration." She pulls the folder closer.',
              mixed: '"Organ failure. All four. No connection anyone can find — except proximity." She hesitates. "They were all near Mr. Avery\'s bay. But he\'s... he\'s fine. Better than fine."',
              success: '"They all died the same way. Slow organ failure, no cause. Every one of them spent hours near Bay 7 — near Gordon." She opens the folder. "And here\'s what nobody wants to talk about: Gordon\'s bloodwork. His cancer markers are gone. Not remission — *gone*. His tissue regeneration is off the charts. He\'s getting younger while everyone around him gets worse."',
            },
          },
          {
            id: 'q-gordon',
            question: '"Tell us about Gordon Avery."',
            responses: {
              miss: '"He\'s a patient. A lovely man. I really can\'t say more." She\'s protecting him.',
              mixed: '"Sweetest man you\'ll ever meet. Retired teacher. He was dying six months ago — stage four lung cancer. Then Meridian put him on that trial and..." She glances at the empty beds. "Miracle."',
              success: '"He was dying. Stage four. Then the trial, and now — look at his charts." She slides the folder across. "Eighty-year-old bloodwork going backwards. His cells are regenerating faster than anything I\'ve seen. He looks ten years younger than when he was admitted." Her voice drops. "And four people who sat near him are dead."',
            },
          },
          {
            id: 'q-meridian',
            question: '"What do you know about the Meridian trial?"',
            responses: {
              miss: '"Clinical trials happen here all the time. I wouldn\'t know the details."',
              mixed: '"Meridian BioSciences. They ran a small trial — four subjects, I think. Gordon was the only one who responded. Then the company dissolved overnight. Took their equipment, wiped their computers."',
              success: '"Meridian ran a trial with four subjects. Only Gordon responded — the others showed no effect. Then the company dissolved overnight. Packed up their lab, shredded everything." She leans in. "The Meridian team had access to Bay 7 after hours. I saw them once — 2 AM, running equipment I didn\'t recognise. They weren\'t treating cancer."',
            },
          },
        ],
      },
    ],
  },

  // ── Avery Family Residence ─────────────────────────────────────────────────
  {
    locationId: 'loc-family-home',
    ambiance: 'A warm house. Dead plants on every windowsill. The dog sleeps in the garden and won\'t come inside.',
    scene: [
      { type: 'text', content: 'The Avery house is tidy, bright, and faintly wrong. ' },
      { type: 'element', elementId: 'dead-plants' },
      { type: 'text', content: ' line every windowsill — brown and curled despite the care someone clearly gave them. In the living room, ' },
      { type: 'element', elementId: 'gordon-chair' },
      { type: 'text', content: ' sits in an armchair reading to his granddaughter, his colour healthy, his voice warm. He looks better than any fifty-eight-year-old has a right to. The girl leans against his arm, drowsy. A ' },
      { type: 'element', elementId: 'family-photos' },
      { type: 'text', content: ' shows Gordon across the years — gaunt and grey six months ago, vibrant now. In the kitchen, ' },
      { type: 'element', elementId: 'daughter-kitchen' },
      { type: 'text', content: ' makes tea, moving slowly, pausing to steady herself against the counter.' },
    ],
    elements: [
      {
        id: 'dead-plants',
        label: 'Dead houseplants',
        hint: 'Examine the plants — and take a sample',
        actionType: 'investigate',
        response: {
          miss: 'The plants are dead — all of them, every room. Overwatered, underwatered? You can\'t tell. It feels wrong but you can\'t articulate why.',
          mixed: 'Every plant in the house is dead. They died within a week of Gordon moving in — his daughter mentioned it in passing, embarrassed. The soil is dry but the roots show no disease. Something leached the life from them.',
          success: 'Every plant is dead. The roots are intact, the soil adequate — they simply stopped living. You take a tissue sample from a leaf and compare it to one from the garden outside. Under a hand lens, the dead cells show a faint grey residue — the same particulate found at other PORTAL case sites. The mechanism is written into his environment.',
        },
      },
      {
        id: 'gordon-chair',
        label: 'Gordon',
        hint: 'Interview Gordon Avery',
        actionType: 'interview',
        npcId: 'npc-gordon',
      },
      {
        id: 'family-photos',
        label: 'family photo wall',
        hint: 'The timeline tells a story',
        hidden: true,
        actionType: 'investigate',
        response: {
          miss: 'Family photos. Gordon with his daughter, the grandchildren. A normal family. You\'re not sure what you were looking for.',
          mixed: 'A timeline on the wall. Six months ago: Gordon gaunt, grey, oxygen tube. Four months ago: colour returning, standing unaided. Now: he looks ten years younger. The recovery is impossibly fast.',
          success: 'The photos tell a story nobody has connected yet. Six months ago: Gordon skeletal, grey, dying. Today: ruddy cheeks, bright eyes, standing straight. His daughter, in the same photos, shows the opposite trajectory — thinner, paler, dark circles deepening with each month. The family is mirror images. He rises as she fades.',
        },
      },
      {
        id: 'daughter-kitchen',
        label: 'his daughter',
        hint: 'She needs help',
        actionType: 'helpBystander',
        response: 'She sets down the kettle with shaking hands. "I\'m fine. Just tired. Haven\'t been sleeping well since Dad moved in." She smiles weakly. "It\'s wonderful having him here. The children love him. I just — I can\'t seem to catch up on rest." The dog watches from the garden door, whimpering softly, refusing to cross the threshold.',
      },
    ],
    npcs: [
      {
        npcId: 'npc-gordon',
        name: 'Gordon Avery',
        description: 'He stands to greet you — tall, steady, warm handshake. His colour is excellent. His granddaughter has fallen asleep on the sofa behind him.',
        options: [
          {
            id: 'q-trial',
            question: '"Gordon, can you tell us about the Meridian clinical trial?"',
            responses: {
              miss: '"Oh, the trial? Yes, lovely people. Very thorough." He smiles warmly. "Are you from the follow-up team?" He deflects without knowing it.',
              mixed: '"Wonderful experience, really. Eight weeks of treatment — injections, mostly, and some sort of frequency therapy I didn\'t quite understand. And then..." He spreads his hands. "Miracle. That\'s the only word for it. Stage four to clear in three months."',
              success: '"They treated me for eight weeks. Injections and something they called \'anchoring sessions\' — I\'d sit in Treatment Bay 7 while they ran equipment around me. High-frequency hum. Made my teeth itch." He laughs. "But it worked. I was dying, and now I feel better than I have in twenty years. Stronger. Sharper. Like something inside me woke up." He flexes his hand. "I can feel it sometimes. This warmth in my chest. Like an engine that never stops."',
            },
          },
          {
            id: 'q-family',
            question: '"How has the family been since you moved in?"',
            responses: {
              miss: '"Wonderful. The children are a joy." He doesn\'t notice anything wrong. His love is genuine and absolute.',
              mixed: '"The children are wonderful. Sophie — my granddaughter — she\'s been a bit tired lately. School, probably. And the dog\'s been odd. Won\'t come in the house." He frowns slightly. "The plants all died too. I never had a green thumb."',
              success: '"Sarah — my daughter — she\'s been tired. Headaches. And Sophie fell asleep at school twice this week. The doctor says it\'s nothing." He pauses, and for a moment something flickers across his face. "The dog won\'t come near me anymore. Used to sit at my feet. Now he stays in the garden and cries." He looks at his hands. "I\'m sure it\'s nothing."',
            },
          },
          {
            id: 'q-health',
            question: '"You look remarkably well for someone who had stage four cancer."',
            responses: {
              miss: '"God\'s honest blessing." He says it with total sincerity. You learn nothing new.',
              mixed: '"I know. The doctors can\'t explain it either. My markers are all clear. Better than clear — I feel thirty years old." He taps his chest. "Whatever Meridian did, it fixed everything."',
              success: '"I shouldn\'t be alive. I know that. And I don\'t just mean the cancer — I mean I feel *better* than before. My eyesight improved. My arthritis is gone. I sleep four hours and wake up energised." He lowers his voice. "Sometimes at night, I feel this... pull. Like the warmth in my chest reaching outward. Toward the children\'s rooms." His eyes cloud. "I\'m sure it\'s nothing."',
            },
          },
        ],
      },
    ],
  },

  // ── Meridian BioSciences — Former Offices ──────────────────────────────────
  {
    locationId: 'loc-meridian-office',
    ambiance: 'Stripped walls. Bleach smell. Someone cleaned this place to forget.',
    scene: [
      { type: 'text', content: 'The Meridian BioSciences office is a gutted shell. ' },
      { type: 'element', elementId: 'stripped-walls' },
      { type: 'text', content: ' show the ghosts of removed equipment brackets and cable runs — whatever was here was taken fast and thoroughly. The ' },
      { type: 'element', elementId: 'reception-desk' },
      { type: 'text', content: ' still has the company logo etched into the glass, though someone tried to scratch it off. Down a back corridor, a door marked ' },
      { type: 'element', elementId: 'basement-storage' },
      { type: 'text', content: ' stands ajar — the lock forced recently, but not by you. The air smells of bleach and something metallic, like old blood or burnt copper.' },
    ],
    elements: [
      {
        id: 'stripped-walls',
        label: 'Stripped walls',
        hint: 'Examine the equipment traces',
        actionType: 'investigate',
        response: {
          miss: 'Bare walls, cable holes, scuff marks. A professional removal job. If there were answers here, they left with the furniture.',
          mixed: 'The cable runs suggest heavy equipment — not standard office hardware. Medical-grade power supply, shielded data lines. Whatever Meridian did here, it required more infrastructure than a pharmaceutical office normally would.',
          success: 'The equipment brackets show three distinct installation phases. The last phase — the heaviest — matches the timeline of Gordon\'s trial. Whoever removed the gear left behind mounting bolts rated for MRI-class equipment. This wasn\'t a pharma office. This was a lab disguised as one. A faded label on one bracket reads "BIM-Θ Resonance Chamber — Stage II."',
        },
      },
      {
        id: 'basement-storage',
        label: 'BASEMENT STORAGE',
        hint: 'Search the basement files',
        actionType: 'deepSearch',
        requiresStamina: true,
        response: {
          miss: 'The basement is dark and the shelving runs deep. You lose time navigating empty boxes and misfiled maintenance records. These files could be anywhere.',
          mixed: 'Behind industrial shelving in the basement: a filing cabinet the cleaners missed. Consent forms, dosing schedules — Gordon Avery\'s signature on file 3. A methodology page references "vitality displacement anchoring" and a compound designated "BIM-Θ derivative." The rest of the pages are missing.',
          success: 'A filing cabinet behind industrial shelving — overlooked when Meridian stripped the offices. Inside: partial trial documentation. Gordon Avery\'s consent form (file 3 of 4 subjects). Dosing schedules showing escalating BIM-compound Θ concentrations. A methodology page describing "vitality displacement anchoring — Stage II stabilisation." The procedure was designed to transfer biological vitality from proximate organisms to the subject. Gordon\'s cancer remission wasn\'t the goal. It was a side effect.',
        },
      },
      {
        id: 'reception-desk',
        label: 'reception desk',
        hint: 'Check behind the counter',
        hidden: true,
        actionType: 'investigate',
        response: {
          miss: 'The logo is half-scratched away. Empty reception desks all look the same. Nothing useful.',
          mixed: 'Under the desk, a business card caught in a drawer track: "Dr. L. Harford, Project Director, Meridian BioSciences." The phone number is disconnected.',
          success: 'Under the desk: a business card — "Dr. L. Harford, Project Director." On the back, handwritten: "If subject displays Class-3 displacement, contact Protocol directly. Do NOT involve hospital staff." Below: a phone number with a prefix you recognise from other PORTAL case sites. Meridian wasn\'t independent. Someone was overseeing this.',
        },
      },
    ],
    npcs: [],
  },

  // ── State University — Biochemistry Lab ────────────────────────────────────
  {
    locationId: 'loc-university-lab',
    ambiance: 'Fluorescent hum. Centrifuges idle. A graduate student left in a hurry.',
    scene: [
      { type: 'text', content: 'The biochemistry lab is after-hours quiet. ' },
      { type: 'element', elementId: 'research-terminals' },
      { type: 'text', content: ' line the far wall, logged out but still humming. A ' },
      { type: 'element', elementId: 'reference-shelf' },
      { type: 'text', content: ' holds bound journals and cross-filed clinical trial registrations — decades of pharmaceutical research indexed by company name. On a bench near the window, someone has left a ' },
      { type: 'element', elementId: 'abandoned-analysis' },
      { type: 'text', content: ' — tissue slides and scribbled notes, abandoned mid-conclusion. The notation is meticulous but the handwriting gets shakier toward the end.' },
    ],
    elements: [
      {
        id: 'research-terminals',
        label: 'Research terminals',
        hint: 'Search the clinical trial registry',
        actionType: 'investigate',
        response: {
          miss: 'The databases require institutional credentials. You fumble through guest access but the clinical trial registry is behind a paywall you can\'t navigate quickly.',
          mixed: 'The clinical trial registry shows Meridian BioSciences registered one trial — but cross-referencing the methodology keywords surfaces a second filing under a different company name: Helix Boundary Research. The filings overlap. Same protocol, different front.',
          success: 'Cross-referencing Meridian\'s trial registration with published protocols surfaces a match under "Helix Boundary Research" — same methodology, same compound, same anchoring terminology. The Helix filing is more complete: it includes safety notes, contraindication warnings, and — critically — an emergency reversal section. The reversal procedure exists. Someone filed it alongside the original protocol.',
        },
      },
      {
        id: 'reference-shelf',
        label: 'reference shelf',
        hint: 'Search the trial registrations thoroughly',
        actionType: 'deepSearch',
        requiresStamina: true,
        response: {
          miss: 'Hundreds of bound volumes. You pull trial registrations by date range but the indexing system is opaque. Hours pass. You find pharmaceutical nomenclature you can\'t parse without more context.',
          mixed: 'The Helix Boundary Research filing includes a reversal procedure section, but the critical page — dosing specifications for counter-frequency BIM exposure — is water-damaged. You can make out the location: "original anchoring site" and a partial equipment list. Enough to know it\'s possible. Not enough to do it.',
          success: 'The Helix filing contains the full reversal procedure: "In the event of uncontrolled vitality displacement, administer counter-frequency BIM exposure at the original anchoring site." The original anchoring site is Hargrove Medical Centre, Treatment Bay 7. The equipment can be improvised from standard lab supplies — if you understand the frequency calibration. The filing also notes: "Reversal carries no risk to the subject. The mechanism dissolves cleanly." Gordon can be saved.',
        },
      },
      {
        id: 'abandoned-analysis',
        label: 'half-finished analysis',
        hint: 'Someone was studying this',
        hidden: true,
        actionType: 'investigate',
        response: {
          miss: 'Tissue slides and notes. The handwriting is too cramped to read quickly and some slides have dried out. You can\'t reconstruct what the researcher was working on.',
          mixed: 'Someone was analysing grey cellular residue — the same particulate from the Meridian files. Their notes trail off: "Regeneration rate incompatible with natural biology — energy source external — mechanism unclear." They stopped mid-sentence.',
          success: 'A graduate student was analysing samples of grey residue. Their notes are precise: "Cellular regeneration rate 400% above baseline. Energy source: external biological vitality. Mechanism: parasitic anchoring at subcellular level. The host improves. The proximate organisms decline." They stopped writing after the final note: "This is not a disease. This was designed." They haven\'t been back to the lab since.',
        },
      },
    ],
    npcs: [],
  },

  // ── Riverside Park — Gordon's Walking Route ────────────────────────────────
  {
    locationId: 'loc-park',
    ambiance: 'Brown grass in midsummer. Dead birds on the path. Gordon\'s bench is warm.',
    scene: [
      { type: 'text', content: 'The riverside path is beautiful and wrong. The trees along a ' },
      { type: 'element', elementId: 'dead-stretch' },
      { type: 'text', content: ' are leafless in midsummer, the ground brown and cracked as if winter hit one section and stopped. Joggers loop around it without thinking about why. On a bench near the water, ' },
      { type: 'element', elementId: 'gordon-bench' },
      { type: 'text', content: ' still holds the warmth of someone who sat here this morning — a book left behind, a thermos cap unscrewed. A ' },
      { type: 'element', elementId: 'park-worker' },
      { type: 'text', content: ' drags a bin bag of dead birds along the path, gloves up to his elbows. Further along the bank, a ' },
      { type: 'element', elementId: 'woman-pushchair' },
      { type: 'text', content: ' has stopped, staring at the dead grass line, holding her child closer.' },
    ],
    elements: [
      {
        id: 'dead-stretch',
        label: 'two-hundred-metre stretch of dead grass',
        hint: 'Examine the dead zone',
        actionType: 'investigate',
        response: {
          miss: 'Brown grass, leafless trees. Drought? Contamination? You walk the perimeter but nothing stands out. It could be anything.',
          mixed: 'The dead zone is roughly circular, two hundred metres across, centred on the bench where Gordon sits each morning. The grass didn\'t die from drought — the roots are intact, moisture levels normal. Something drew the life from them. Three stray cats were found dead on the bench last week. No visible cause.',
          success: 'The dead zone is precisely two hundred metres across and expanding — the park crew has measured it growing by ten metres each week. Centred on Gordon\'s bench. The grass, the trees, the insects — all dead within the zone, all healthy outside it. Three stray cats, two squirrels, and a nesting bird found dead with no trauma, no poison. The displacement effect is intensifying. Gordon\'s range is growing.',
        },
      },
      {
        id: 'gordon-bench',
        label: 'Gordon\'s favourite spot',
        hint: 'Examine the bench',
        hidden: true,
        actionType: 'investigate',
        response: {
          miss: 'A bench. A book — a teaching textbook, dog-eared. A thermos of tea. Someone\'s morning routine. You\'re not sure what you expected to find.',
          mixed: 'The bench is warm — body heat, hours after Gordon left. His book is open to a chapter on childhood development. A photo bookmark shows him with his granddaughter. The wood under his usual spot is slightly discoloured, as if bleached by prolonged contact.',
          success: 'The bench is warm — unnaturally so, hours after Gordon left. The wood beneath his spot has paled, the grain bleached white, as if years of sun damage happened in weeks. His book, his thermos, his photo bookmark — all the small kindnesses of a man who doesn\'t know he\'s killing everything around him. A dead sparrow lies beneath the bench, wings folded, as if it simply stopped.',
        },
      },
      {
        id: 'park-worker',
        label: 'park maintenance worker',
        hint: 'He has been tracking the dead zone',
        actionType: 'interview',
        npcId: 'npc-park-worker',
      },
      {
        id: 'woman-pushchair',
        label: 'woman with a pushchair',
        hint: 'She walks here every day',
        actionType: 'helpBystander',
        response: '"I walk here every day. The grass started dying three weeks ago — just that section." She pulls her child closer. "My neighbour\'s cat used to hunt along here. Found it dead last Tuesday. No marks. Just... stopped." She looks at the bench. "There\'s an old man who sits there every morning. Lovely man. Always waves at the baby." She shudders. "I\'ve started taking the long way round."',
      },
    ],
    npcs: [
      {
        npcId: 'npc-park-worker',
        name: 'Park Maintenance — Riverside Section',
        description: 'He drops the bin bag heavily. "You from the council?" He doesn\'t wait for an answer. He has been filing reports no one reads.',
        options: [
          {
            id: 'q-dead-zone',
            question: '"What\'s happening to the grass and the wildlife?"',
            responses: {
              miss: '"No idea. Council says it\'s a drainage issue." He has been told what to say and he\'s sticking to it.',
              mixed: '"Started three weeks ago. Just this section. I\'ve pulled four dead animals out this week alone — birds, cats, a fox. No marks, no poison. My supervisor says drought." He kicks the brown grass. "It\'s July. We\'ve had rain every week."',
              success: '"Three weeks ago, everything along this stretch started dying. I map it every morning — it\'s growing. Ten metres wider each week. And it\'s centred on that bench." He points. "An old fellow sits there every morning, rain or shine. Reads his book, drinks his tea. Healthiest-looking man I\'ve ever seen." He pauses. "Everything within two hundred metres of where he sits is dead or dying. And he looks better every day."',
            },
          },
          {
            id: 'q-gordon-routine',
            question: '"Tell us about the man on the bench."',
            responses: {
              miss: '"An old bloke. Keeps to himself. That\'s all I know." He picks up the bag and walks.',
              mixed: '"Gordon, I think. Retired teacher. Comes every morning at seven, leaves at nine. Friendly. Waves at the joggers." He frowns. "The birds used to land near him. Now they don\'t come within fifty metres."',
              success: '"Gordon. He\'s here every morning. Started coming about a month ago — said he\'d just recovered from something and wanted to be outside more." He lowers his voice. "When he first came, the dead zone was maybe twenty metres around the bench. Now look at it." He gestures at the brown expanse. "I tried sitting on that bench after he left one day. Warm. Really warm. And I felt... tired. Bone-tired, just from sitting there five minutes." He shakes his head. "I filed a report. Nobody called back."',
            },
          },
        ],
      },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getNarrativeForLocation(locationId: string): LocationNarrative | null {
  return NARRATIVES.find((n) => n.locationId === locationId) ?? null
}

export function getElementById(narrative: LocationNarrative, elementId: string): SceneElement | null {
  return narrative.elements.find((e) => e.id === elementId) ?? null
}

export function getNpcById(narrative: LocationNarrative, npcId: string): NpcDialogue | null {
  return narrative.npcs.find((n) => n.npcId === npcId) ?? null
}
