/**
 * Narrative overlay for mystery-001: "A Promise Is a Promise"
 *
 * Provides scene text, interactive elements, NPC dialogue, and map data
 * for the InvestigationScreen narrative renderer.
 *
 * This is a purely presentational layer — engine actions are unchanged.
 * Scene elements map 1-to-1 to engine action types.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SceneSegment {
  type: 'text' | 'element'
  content?: string    // for 'text' segments
  elementId?: string  // for 'element' segments
}

export interface SceneElement {
  id: string
  label: string             // text shown inline in the scene description
  hint?: string             // shown on hover for visible elements
  hidden?: boolean          // not highlighted — discoverable by clicking
  actionType: 'investigate' | 'interview' | 'helpBystander' | 'deepSearch' | 'fightMinion'
  requiresStamina?: boolean // deepSearch / fightMinion consume stamina
  npcId?: string            // if set, clicking opens the dialogue modal
  response?: string         // narrative feedback shown after the action (no-roll actions)
}

export interface DialogueOption {
  id: string
  question: string
  responses: {
    miss: string
    mixed: string
    success: string
  }
}

export interface NpcDialogue {
  npcId: string
  name: string
  description: string
  options: DialogueOption[]
}

export interface LocationNarrative {
  locationId: string
  ambiance: string        // one-liner shown below location name
  scene: SceneSegment[]  // narrative text broken into text + element refs
  elements: SceneElement[]
  npcs: NpcDialogue[]
}

// ─── ASCII Mini-map ──────────────────────────────────────────────────────────
//
// Location graph:
//   CAMPUS ↔ GARDEN ↔ LAB ↔ CAMPUS  (triangle)
//   DORMS → CAMPUS
//   LIBRARY → CAMPUS
//
//       [LIB]
//         │
// [DRM]─[CAM]─[GDN]
//         │     │
//       [LAB]───╯

export const MAP_ROWS = [
  '      [LIB]     ',
  '        │       ',
  '[DRM]─[CAM]─[GDN]',
  '        │     │ ',
  '      [LAB]───╯ ',
]

export const MAP_TOKENS: Record<string, string> = {
  '[LIB]': 'loc-university-library',
  '[CAM]': 'loc-campus-grounds',
  '[GDN]': 'loc-memorial-garden',
  '[DRM]': 'loc-student-dorms',
  '[LAB]': 'loc-science-lab',
}

// ─── Location Narratives ─────────────────────────────────────────────────────

const NARRATIVES: LocationNarrative[] = [
  // ── Campus Grounds ──────────────────────────────────────────────────────────
  {
    locationId: 'loc-campus-grounds',
    ambiance: 'Ash dusts the walkways. Students avoid the northern path.',
    scene: [
      { type: 'text', content: 'The university grounds are quiet for midafternoon. A fine layer of ' },
      { type: 'element', elementId: 'ash-powder' },
      { type: 'text', content: ' coats the walkways between the science building and the memorial garden — swept up hourly, back by morning. Near the bench circle, ' },
      { type: 'element', elementId: 'students-gathered' },
      { type: 'text', content: ' cluster in low voices, phones in pockets, not lingering. A ' },
      { type: 'element', elementId: 'maintenance-worker' },
      { type: 'text', content: ' pushes the same broom she has pushed for the past three days, not meeting anyone\'s eyes.' },
    ],
    elements: [
      {
        id: 'ash-powder',
        label: 'grey ash powder',
        hint: 'Examine the ash residue',
        actionType: 'investigate',
        response: 'The ash is odourless, cold, and impossibly fine. It does not smear — it simply reforms. A faint trail connects the memorial garden to the science building, as if someone walked this path every night and left nothing behind but dust.',
      },
      {
        id: 'students-gathered',
        label: 'students gathered near the path',
        hint: 'Interview the students',
        actionType: 'interview',
        npcId: 'npc-campus-students',
      },
      {
        id: 'maintenance-worker',
        label: 'maintenance worker',
        hint: 'She has been watching',
        hidden: true,
        actionType: 'helpBystander',
        response: '"Three days now. Same ash. Comes back every morning." She resumes sweeping without looking up. "Building B corridor, second floor. Two AM. Every night. I don\'t ask questions."',
      },
    ],
    npcs: [
      {
        npcId: 'npc-campus-students',
        name: 'Students — Campus Path',
        description: 'A cluster of second-years. They\'ve been avoiding this path for two weeks and they\'re not sure why they came back.',
        options: [
          {
            id: 'q-ash',
            question: '"What do you know about the ash?"',
            responses: {
              miss: 'They look at you warily. "Who are you? Campus maintenance?" They drift off without another word.',
              mixed: '"It appears overnight. Starts near the garden, ends at the science building. Campus said it\'s a ventilation thing." They don\'t believe that either.',
              success: '"It\'s been getting worse," one says. "And there\'s a girl. At night — by the garden. She just stands there. Grey footprints in the morning." They exchange a look. "We\'ve stopped walking that path after dark."',
            },
          },
          {
            id: 'q-balint',
            question: '"Do you know a student named Bálint Kővári?"',
            responses: {
              miss: '"Don\'t know him." They\'re lying — badly — but they won\'t say more.',
              mixed: '"Second year chem. Keeps to himself lately. Used to be normal." They shrug. "Something happened to him this term."',
              success: '"He\'s been off since the start of this year. His whole corridor\'s been on edge. I heard the girl — whoever she is — was standing outside his door last Tuesday. Just standing there. Then gone."',
            },
          },
        ],
      },
    ],
  },

  // ── Student Dormitories ──────────────────────────────────────────────────────
  {
    locationId: 'loc-student-dorms',
    ambiance: 'Grey smudges streak the corridor walls. The door at the end is closed.',
    scene: [
      { type: 'text', content: 'The dormitory corridor is quiet at this hour. Along the baseboards, ' },
      { type: 'element', elementId: 'ash-smudges' },
      { type: 'text', content: ' trace a path from the stairwell toward the far end — faint, cold, footprint-shaped. The door marked ' },
      { type: 'element', elementId: 'balint-door' },
      { type: 'text', content: ' is closed. Music plays faintly inside. At the common area table, ' },
      { type: 'element', elementId: 'dorm-student' },
      { type: 'text', content: ' hunches over a laptop, earbuds in, deliberately not looking at the corridor.' },
    ],
    elements: [
      {
        id: 'ash-smudges',
        label: 'grey smudges along the baseboard',
        hint: 'Examine the trail',
        actionType: 'investigate',
        response: 'The smudges are footprint-shaped — small, bare feet, impossibly cold to the touch. They lead from the stairwell to room 214 and stop at the door. The same path, every night.',
      },
      {
        id: 'balint-door',
        label: 'B. KŐVÁRI — Rm 214',
        hint: 'Interview Bálint',
        actionType: 'interview',
        npcId: 'npc-balint',
      },
      {
        id: 'dorm-student',
        label: 'a student at the common area table',
        hint: 'She has noticed things',
        hidden: true,
        actionType: 'interview',
        npcId: 'npc-dorm-student',
      },
    ],
    npcs: [
      {
        npcId: 'npc-balint',
        name: 'Bálint Kővári — Rm 214',
        description: 'He opens the door after a long pause. Dark circles under his eyes. Ash on the windowsill behind him. He doesn\'t ask who you are.',
        options: [
          {
            id: 'q-ash',
            question: '"We\'re here about the ash. Do you know where it\'s coming from?"',
            responses: {
              miss: 'He blinks. "What ash?" The window behind him is frosted with it. He has trained himself not to see it.',
              mixed: '"I don\'t — it\'s everywhere lately. Campus is investigating." He glances at the windowsill. He knows it\'s not campus.',
              success: '"It started six weeks ago. Right after I stopped visiting the grave." He says it quietly, like he has been waiting for someone to ask. "I know how that sounds. But it\'s connected. I just don\'t know how to explain it."',
            },
          },
          {
            id: 'q-girl',
            question: '"Students have seen a young woman near this floor at night."',
            responses: {
              miss: 'His expression closes like a door. "I wouldn\'t know." He starts to push the door shut.',
              mixed: '"People say things. It\'s an old building." He\'s not convincing himself.',
              success: '"She comes to the window." He says it to the floor. "Every third night or so. She just looks in. She looks exactly the same as the day she died." His hands are shaking. "I don\'t know what she wants from me."',
            },
          },
          {
            id: 'q-promise',
            question: '"Tell us about the promise you made."',
            responses: {
              miss: 'He goes very still. "What promise?" The door begins to close.',
              mixed: '"I made a lot of promises. To a lot of people." He can\'t look at you. "That was a long time ago."',
              success: '"She was dying." He sits down. His voice breaks. "She made me promise I would never forget her. I said yes. I meant it. And then I started to forget. Her face, her voice. Just — fading. And she came back." He looks up. "I think she\'s waiting for me to do something. I don\'t know what."',
            },
          },
        ],
      },
      {
        npcId: 'npc-dorm-student',
        name: 'Resident — Common Room',
        description: 'She pulls out an earbud reluctantly. She has been trying very hard not to be part of whatever this is.',
        options: [
          {
            id: 'q-noticed',
            question: '"Have you noticed anything strange on this floor?"',
            responses: {
              miss: '"Nothing. Excuse me." The earbud goes back in.',
              mixed: '"The ash, yeah. Campus said it\'s a building thing." She\'s deflecting.',
              success: '"There\'s a girl who comes at night. Twice I\'ve seen her from the hall — just standing outside his room." She nods toward 214. "She doesn\'t move. She doesn\'t say anything. And then she\'s just gone. The ash is always worse the next morning."',
            },
          },
        ],
      },
    ],
  },

  // ── University Library ───────────────────────────────────────────────────────
  {
    locationId: 'loc-university-library',
    ambiance: 'Quiet stacks. The archive room is at the back, past the reading desks.',
    scene: [
      { type: 'text', content: 'The library is nearly empty. A bored archivist processes returns at the reference desk. Beyond the reading room, a door labelled ' },
      { type: 'element', elementId: 'archive-door' },
      { type: 'text', content: ' leads to a room of old filing cabinets and digitised student records. On the front desk: a ' },
      { type: 'element', elementId: 'campus-bulletin' },
      { type: 'text', content: ' describes the ash incidents as a "maintenance anomaly under investigation." A trolley of ' },
      { type: 'element', elementId: 'old-yearbooks' },
      { type: 'text', content: ' from five years ago sits half-shelved near the returns counter.' },
    ],
    elements: [
      {
        id: 'archive-door',
        label: 'UNIVERSITY ARCHIVES — Authorised Access',
        hint: 'Investigate the records',
        actionType: 'investigate',
        response: 'The archive yields a student enrolment file: Eszter Vasarhelyi, chemistry programme, admitted five years ago. Died in a cycling accident at the end of her first year. Emergency contact: Balint Feher. A small photograph shows a dark-haired young woman wearing a silver locket.',
      },
      {
        id: 'old-yearbooks',
        label: 'yearbooks from five years ago',
        hint: 'Search more thoroughly',
        actionType: 'deepSearch',
        requiresStamina: true,
        response: 'The yearbook from five years ago has a class photo. Third row, second from left — a young woman with dark hair and a quiet smile. The name beneath reads: Eszter Vasarhelyi. She looks exactly like the figure the students described.',
      },
      {
        id: 'campus-bulletin',
        label: 'campus administrative bulletin',
        hint: 'Note how they are framing it',
        hidden: true,
        actionType: 'investigate',
        response: 'The bulletin describes a "recurring maintenance issue" causing grey residue in the corridors. No mention of the hospitalisations. Someone is keeping this quiet.',
      },
    ],
    npcs: [],
  },

  // ── Science Lab ─────────────────────────────────────────────────────────────
  {
    locationId: 'loc-science-lab',
    ambiance: 'Everything within two metres of Bálint\'s bench is coated in ash.',
    scene: [
      { type: 'text', content: 'Bálint\'s research lab is small — two benches, a fume hood, a wall of reference texts. The air smells faintly of cold stone. A ' },
      { type: 'element', elementId: 'lab-journal' },
      { type: 'text', content: ' sits open at a recent entry, the handwriting shaky. Everything near the ' },
      { type: 'element', elementId: 'lab-desk' },
      { type: 'text', content: ' is grey with ash. The ' },
      { type: 'element', elementId: 'desk-drawer' },
      { type: 'text', content: ' is closed — something warm radiates through it. At the window, ' },
      { type: 'element', elementId: 'window-marks' },
      { type: 'text', content: ' press into the glass from outside: ash, in the shape of two palms.' },
    ],
    elements: [
      {
        id: 'lab-journal',
        label: 'lab journal',
        hint: 'Read the recent entries',
        actionType: 'investigate',
        response: 'A recent entry in shaking handwriting: "She visits again. Third time this week. I can see her at the window — looking in, not looking at me. She looks exactly the same as the day she died. I don\'t know if I should be afraid or relieved. The ash follows me everywhere. I think she knows I haven\'t been visiting her grave."',
      },
      {
        id: 'lab-desk',
        label: 'ash-covered research bench',
        hint: 'Examine the area',
        actionType: 'investigate',
        response: 'Everything within two metres of Balint\'s bench is coated in fine grey ash. The instruments are untouched beneath it — the ash doesn\'t interfere, it just... covers. Like snowfall in a room with no windows open.',
      },
      {
        id: 'desk-drawer',
        label: 'Bálint\'s desk drawer',
        hint: 'Search it thoroughly',
        actionType: 'deepSearch',
        requiresStamina: true,
        response: 'At the back of the drawer: a small silver locket filled with grey ash. It is warm to the touch. When you hold it, it pulses faintly — like a slow heartbeat. The air grows heavier. This is the anchor.',
      },
      {
        id: 'window-marks',
        label: 'ash palm prints on the glass',
        hint: 'Investigate the marks',
        hidden: true,
        actionType: 'investigate',
        response: 'Two palm prints pressed into the glass from outside. The ash is cold, but the prints are fresh. Someone — something — stood here recently, hands against the window, watching the room.',
      },
    ],
    npcs: [],
  },

  // ── Memorial Garden ──────────────────────────────────────────────────────────
  {
    locationId: 'loc-memorial-garden',
    ambiance: 'A three-metre circle of ash. Fresh flowers on the bench. No wind.',
    scene: [
      { type: 'text', content: 'The memorial garden is still in the way that feels deliberate. A stone bench bears a plaque for students who have died during their time here. Around it: a ' },
      { type: 'element', elementId: 'ash-circle' },
      { type: 'text', content: ', three metres across and perfectly circular. It has been here every morning for six weeks. ' },
      { type: 'element', elementId: 'fresh-flowers' },
      { type: 'text', content: ' lean against the bench — no card, no name. At the garden\'s edge, ' },
      { type: 'element', elementId: 'campus-security' },
      { type: 'text', content: ' stares at her phone, boots grey with ash, trying to decide whether to write this up.' },
    ],
    elements: [
      {
        id: 'ash-circle',
        label: 'circle of grey ash',
        hint: 'Examine the pattern',
        actionType: 'investigate',
        response: 'The circle is three metres across, perfectly round, centred on the memorial bench. Campus CCTV shows the same figure standing here every night between 2 and 3 AM — same position, same time, for six weeks. The bench plaque does not list her name. But someone leaves fresh flowers here every few days.',
      },
      {
        id: 'campus-security',
        label: 'campus security officer',
        hint: 'She has the CCTV logs',
        actionType: 'helpBystander',
        response: 'She pulls up the CCTV feeds on her tablet. "Nothing on camera — but the motion sensors trip every night at 2 AM. Same corridor, Building B. I filed the reports." She shakes her head. "Nobody reads them."',
      },
      {
        id: 'fresh-flowers',
        label: 'unsigned fresh flowers',
        hint: 'Search the surrounding area',
        hidden: true,
        actionType: 'deepSearch',
        requiresStamina: true,
        response: 'The flowers are lilies — the same variety, placed every three days. No card. No florist wrapping. Someone is maintaining a vigil here, in a place where the university forgot to add her name.',
      },
    ],
    npcs: [],
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
