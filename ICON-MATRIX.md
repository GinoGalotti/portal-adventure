# Icon Asset Matrix — PORTAL Field Operations Game

Every icon the game needs, with exact filenames and where to find them on game-icons.net.

Download as SVG: Type=texture, Texture=none (white on transparent). Save with the filename listed. CSS handles all colouring at runtime.

Colours applied in code: `--green-dim` (#1a7a43) default, `--green` (#2ecc71) active, `--text-dim` (#5a7a62) dim, `--amber` (#f0a500) warning, `--red` (#e05050) danger.

Credit required: "Icons by game-icons.net" (CC BY 3.0).

---

## Folder Structure

```
assets/icons/
├── playbooks/
├── stats/
├── actions/
├── locations/
├── monsters/
├── ui/
├── conditions/
├── clues/
└── facilities/
```

---

## playbooks/

| Filename | Archetype | Search on game-icons.net | Notes |
|----------|-----------|------------------------|-------|
| `expert.svg` | Investigator / scholar (MVP) | book-aura | Knowledge-first class |
| `wronged.svg` | Vengeance seeker (MVP) | broken-heart | Driven by loss |
| `professional.svg` | Tactical operative (MVP) | crosshair | Military/agency precision |
| `spooky.svg` | Dark powers (MVP) | evil-eyes | Unsettling, weird |
| `chosen.svg` | Destined warrior | sword-brandish | Destiny weapon |
| `crooked.svg` | Con artist / thief | lockpicks | Resourceful, shady |
| `divine.svg` | Holy warrior | angel-wings | Religious duty |
| `flake.svg` | Conspiracy theorist | paranoia | Sees hidden connections |
| `initiate.svg` | Cult / sect member | secret-book | Arcane knowledge |
| `monstrous.svg` | Half-monster | wolf-head | Supernatural nature |
| `mundane.svg` | Ordinary survivor | shield-reflect | Survives against odds |
| `spell-slinger.svg` | Combat mage | fire-ray | Offensive magic |
| `sidekick.svg` | Loyal companion | linked-rings | Bound to another hunter |
| `action-scientist.svg` | Mad scientist / inventor | erlenmeyer | Science as weapon |
| `changeling.svg` | Shapeshifter / fae | butterfly | Shifting identity |

---

## stats/

| Filename | Stat | Search on game-icons.net |
|----------|------|------------------------|
| `charm.svg` | Charm | conversation |
| `cool.svg` | Cool | meditation |
| `sharp.svg` | Sharp | brain |
| `tough.svg` | Tough | muscle-up |
| `weird.svg` | Weird | third-eye |

---

## actions/

Investigation + confrontation actions in one folder.

| Filename | Action | Search on game-icons.net | Phase |
|----------|--------|------------------------|-------|
| `investigate.svg` | Investigate | magnifying-glass | Investigation |
| `interview.svg` | Interview NPC | conversation | Investigation |
| `deep-search.svg` | Deep Search | archive-research | Investigation |
| `fight.svg` | Fight Minion | sword-clash | Investigation |
| `help.svg` | Help Bystander | helping-hand | Investigation |
| `travel.svg` | Travel | walk | Investigation |
| `rest.svg` | Rest / Regroup | bandage-roll | Investigation |
| `assist.svg` | Assist another hunter | backup | Both |
| `special.svg` | Use Special Move | bolt-spell-cast | Both |
| `attack.svg` | Attack | sword-wound | Confrontation |
| `defend.svg` | Defend | shield | Confrontation |
| `resist.svg` | Resist | dodging | Confrontation |
| `distract.svg` | Distract | rear-aura | Confrontation |
| `assess.svg` | Assess situation | semi-closed-eye | Confrontation |
| `exploit.svg` | Exploit Weakness | bullseye | Confrontation |
| `push-luck.svg` | Push Your Luck | perspective-dice-six-faces-random | Confrontation |

---

## locations/

| Filename | Location Type | Search on game-icons.net |
|----------|--------------|------------------------|
| `crime-scene.svg` | Crime Scene | chalk-outline-murder |
| `witness-home.svg` | Witness Home | wooden-door |
| `library.svg` | Library / Archive | bookshelf |
| `lair.svg` | Monster's Lair | cave-entrance |
| `public.svg` | Public Space | street-light |
| `hidden.svg` | Hidden Area | secret-door |
| `hospital.svg` | Hospital | hospital-cross |
| `school.svg` | School | graduate-cap |
| `forest.svg` | Forest | forest |
| `underground.svg` | Subway / Underground | mine-wagon |
| `factory.svg` | Factory | factory |
| `church.svg` | Church | church |
| `university.svg` | University | archive-research |
| `cemetery.svg` | Memorial / Cemetery | tombstone |
| `research-lab.svg` | Research Lab | microscope |

---

## monsters/

| Filename | Monster Type | Search on game-icons.net |
|----------|-------------|------------------------|
| `beast.svg` | Beast | wolf-howl |
| `devourer.svg` | Devourer | fangs |
| `trickster.svg` | Trickster | masks-theater |
| `torturer.svg` | Torturer | meat-hook |
| `destroyer.svg` | Destroyer | demolish |
| `parasite.svg` | Parasite | virus |
| `sorcerer.svg` | Sorcerer | spell-book |

---

## ui/

| Filename | Purpose | Search on game-icons.net |
|----------|---------|------------------------|
| `dice.svg` | Dice / Roll | perspective-dice-six-faces-random |
| `countdown.svg` | Countdown timer | hourglass |
| `intel.svg` | Intel Level indicator | light-bulb |
| `clue.svg` | Clue Found | scroll-unfurled |
| `stamina.svg` | Stamina pool | sprint |
| `report.svg` | Field Report | tied-scroll |
| `archive.svg` | Archive browser | archive-register |
| `save.svg` | Save Slot | floppy-disk |
| `settings.svg` | Settings | cog |
| `undo.svg` | Undo action | anticlockwise-rotation |
| `debug.svg` | Debug panel | terminal |
| `map.svg` | Map | treasure-map |
| `lock.svg` | Auth / Login | padlock |
| `new-game.svg` | New Game | power-button |
| `confrontation.svg` | Confrontation Start | swords-emblem |
| `victory.svg` | Victory | laurels |
| `defeat.svg` | Defeat | broken-shield |
| `achievement.svg` | Achievement | medal |

---

## conditions/

| Filename | Condition | Search on game-icons.net | Colour in code |
|----------|-----------|------------------------|----------------|
| `healthy.svg` | Healthy | heart-beats | --green |
| `injured.svg` | Injured | bandaged | --amber |
| `traumatized.svg` | Traumatized | screaming | --amber |
| `critical.svg` | Critical / Unstable | heartburn | --red |
| `dead.svg` | Dead | skull | --red |

---

## clues/

| Filename | Intel Level | Search on game-icons.net | Colour in code |
|----------|-------------|------------------------|----------------|
| `blind.svg` | Blind (0–1 clues) | blindfold | --red |
| `partial.svg` | Partial (2–3 clues) | semi-closed-eye | --amber |
| `informed.svg` | Informed (4–5 clues) | eye-shield | --green-dim |
| `prepared.svg` | Prepared (6+ clues) | eye-target | --green |

---

## facilities/ (Phase 2)

| Filename | Facility | Search on game-icons.net |
|----------|----------|------------------------|
| `lab.svg` | Research Lab | microscope |
| `medbay.svg` | Medical Bay | first-aid |
| `armory.svg` | Armory | ammo-box |
| `archives.svg` | Archives | archive-register |
| `training.svg` | Training Room | weight-lifting-up |
| `recruitment.svg` | Recruitment | id-card |

---

## Grindhaus Assets

Already in `assets/grindhaus_64/` and `assets/grindhaus_32/`. Use only for:

- Harm pip textures (blood splatters behind filled harm squares)
- Injury overlays on hunter cards
- Confrontation atmosphere (subtle background during combat)
- Death events (when a hunter dies)
- Monster encounter headers

Do NOT use for general UI — reserve for moments where the clean terminal cracks and something visceral shows through.

---

## MVP Priority (download these 24 first)

1. `playbooks/`: expert, wronged, professional, spooky
2. `stats/`: charm, cool, sharp, tough, weird
3. `actions/`: investigate, interview, deep-search, fight, help, travel, rest, assist, special
4. `clues/`: blind, partial, informed, prepared
5. `ui/`: dice, countdown
