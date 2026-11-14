# Echoes: full idea outline

Working document for the JMU makeathon. Everything we agreed on lives here. The pitch deck, the website and the local demo should all pull from this file.

## Prompt

"Break out of your comfort zone."

- Helping first years adjust to college life
- Encouraging students to connect with people outside their major
- Helping students connect with their area, not just their college
- Asking for help mentally and academically
- Meeting new people and connecting in a digital world

## One-line pitch

Echoes is a haunted campus made of anonymous voice notes. Each note is pinned to a real place, and you can only hear it by standing there.

## The concept

Students leave short anonymous voice recordings pinned to real locations on campus and around Harrisonburg. To hear one you have to be physically at that spot. Over time the campus fills with voices, and popular recordings turn into shared campus folklore: things everyone has heard of and can talk about.

JMU is the pilot and the demo. The product is built as a drop-in campus kit so any college can run it:

- Sign in with a school .edu email
- Building and area geofences pulled from OpenStreetMap
- Class and subject tags pulled from the school's course catalog

Onboarding a new campus should be configuration, not a rebuild. For the hackathon we describe this rather than build it.

## Core thesis

Echoes become campus folklore. Every campus has shared references, like a strange statue or a dining hall rumor, that take years to build up. Echoes generates them on purpose. Strangers end up with something to say to each other ("did you hear the one outside the CS building?") without the app arranging any meetup.

We deliberately dropped features that add tasks on top of the echoes (Echo Walks, Keepers, Echo Twins, duet reveals, co-recorded echoes, mandatory meetups). The product is the echoes. Everything else supports them.

## How it answers the prompt

The comfort zone breaks in four small steps, each a little outside what a student would normally do:

1. **Go.** You visit places on campus you would never stop at, because that is where the voice is.
2. **Hear.** You listen to people outside your circle and outside your major.
3. **Say.** You leave an echo yourself, anonymously, which is the lowest-risk way to speak up.
4. **Receive.** You get a reply that points to something real and nearby.

### The student with no friends

The hard case: a freshman who moved cross-country, knows nobody and has no idea where to start.

Listening alone does not make friends. It tells them they are not the only one, and it gets them out of their room. Three small additions turn echoes into a way into communities that already exist:

- **Open doors.** An echo can carry an optional standing invitation to a real place or event. Example: "I was terrified to walk into the climbing club the first time. They meet Wednesdays at 7 at UREC and they're nice." The voice stays anonymous. The invitation points at something real.
- **Community echoes.** Verified clubs, orgs and local places leave echoes in their own voice (an a cappella group, a club meeting, the farmers market). The map doubles as a living directory of where people gather, including Harrisonburg and not just campus.
- **Warm replies.** A lonely echo ("I moved from Oregon and haven't talked to anyone in two weeks") gets voice replies from strangers. Replies can also carry open doors ("I did that my first month, come to Thursday dinner, I'll be around").

Why this should help, step by step:

- Standing at a spot to hear a voice gets them out of their room with a reason that does not need another person.
- Hearing others describe the same loneliness challenges the belief that everyone else already has friends. This is a known pattern in social psychology (pluralistic ignorance). We use it as the reason the design should help, not as a proven result for this app.
- Posting anonymously is the smallest possible act of speaking up.
- A reply with a real invitation turns anonymity into a first step toward a room with people in it.

### A limit we state plainly

The app does not make friends by itself. It lowers the effort needed at each step and keeps pointing toward real human communities. The actual comfort-zone moment is walking into the room an echo pointed to.

## Mechanics we agreed on

- **Location-locked playback.** You can only hear an echo within range of its spot. No listening from your room.
- **Heat map.** "Hot" means activity. Tap a hot zone to see what is trending there. It answers "where is something being said."
- **Legends.** Echoes with many listens and "me too" taps grow into Legends. They glow larger on the map and get an auto-generated title (for example "The Carrier Stairwell Confession"). Legends answer "what is everyone talking about."
- **Ranking by relatability.** Popularity is measured by "me too" taps, not laughs, so the leaderboard rewards echoes people relate to and not echoes people mock.
- **Location-locked sharing.** Sharing an echo sends a friend a pin and a prompt to go there ("go to the second floor of Carrier and listen to this"). Sharing pulls friend groups to a place together, and friends come from different majors and dorms, so circles widen without any meetup feature.
- **Author view.** Authors stay anonymous and can only see how many people listened and how many said "me too." They never see who.
- **Streaks and achievements.** These reward variety inside the same area (for example hearing echoes from six different spots in a week), not distance. Nobody should have to travel far.
- **Humor allowed.** Funny echoes sit next to serious ones. The running joke is the CS building: people crying over exams and specific classes. The tone is affectionate and about the course, not about a person. A mixed tone lowers the barrier to posting.
- **Seasons.** The map changes with the semester (first week, midterms, finals). Old echoes fade and new ones surface, so the map keeps moving.
- **Decay.** Echoes lose strength over time unless people keep visiting and listening. Forgotten corners of campus and town go dark, which pulls people toward them. This is a lightweight mechanic and is optional for the MVP.
- **Listen before you post.** A user hears a handful of echoes before they can record one, so the app builds a listening habit and does not become a vent dump. Optional.
- **Passport.** A light record of the buildings and areas you have heard echoes in, including buildings outside your major. Optional.

## Moderation and safety

Yik Yak is the cautionary tale. It showed students will be honest when anonymous, and it showed what happens with no guardrails. We keep the honesty and add the guardrails.

- Voice only. No free-text comments.
- Transcript screening before anything goes live.
- No naming individuals (students or professors). Flag and block.
- Replies are limited to a "me too" tap or a supportive voice reply.
- Crisis-adjacent content is kept out of Legends and gets a resource card (for example campus counseling) in place of a leaderboard slot. Flagged content is routed for review before it goes live.
- Authors can retire their own echo at any time.
- .edu sign-in so the community is real students.
- No contact between strangers is arranged by the app, so the meetup risks of location-matching apps do not apply.

## Honest positioning

The core mechanic is not new. Geo-locked and anonymous audio apps already exist:

- EchoTether (voice notes unlocked near a spot)
- Placetalk (community map of location-pinned voice clips, one minute or less)
- Geocaster (attach your voice to any location)
- Lore (stories unlock when you arrive)
- Broadcastr (2011) and Recho (2014)
- Hear Me Out: Anonymous Audio (anonymous voice chat for a campus)
- LooQN (anonymous map-based voice board, 24-hour expiry)
- Yik Yak (hyperlocal anonymous text on campuses)
- DePause (anonymous mood map for a campus) and HGSE Heartbeat (voice notes for belonging) as nearby hackathon-style work

We say so in the pitch and then say what is different:

1. Campus folklore through Legends, and ranking by relatability.
2. Open doors and community echoes, so the map points at real groups and real places.
3. Warm replies for people who are alone.
4. Guardrails learned from Yik Yak.
5. A campus kit that works at any college.

Judges tend to reward a team that names the competition and explains the difference over a team that claims nothing exists. We have not verified why each smaller app failed. The Yik Yak lessons are documented. The rest is our reading of common patterns (empty maps, novelty wearing off, no outcome beyond listening).

## Why earlier apps fail, and what we do about it

| Failure | Our answer |
|---|---|
| Toxicity and harassment | Voice only, transcript screening, no naming people, supportive replies only |
| Empty map on day one | One campus at a time, building as the unit, 15 to 20 seeded echoes, "listen from anywhere" preview |
| Novelty wears off | Seasons, decay, Legends that change weekly |
| Passive, with no outcome | Open doors, community echoes and warm replies point to real places |

## Demo story: Maya from Oregon

Follow one persona over a week.

- **Day 1.** Maya hears an echo at the library.
- **Day 3.** She taps "me too" on one about feeling out of place.
- **Day 5.** She posts her own echo: she moved from Oregon and hasn't talked to anyone in two weeks.
- **Day 6.** She gets a reply with an open door to a club meeting.
- **Day 7.** She shows up.

## Pitch line

"Yik Yak showed students will be honest anonymously. It also showed what happens without guardrails. We keep the honesty, add the guardrails, and turn it into campus folklore that points you toward the people already here."

## Build plan

### Must have for the demo

- Map with geofenced pins
- Location-locked playback
- Record and upload
- "Me too" tap
- Transcript screening
- Heat map
- Legends (a few seeded ones are fine)

### Mock or describe only

- Open doors and community echoes (can be shown in the UI with seeded data)
- Warm replies
- Achievements and streaks
- Decay, seasons, Passport
- Multi-campus onboarding

### Suggested stack (not decided)

- Web app with a map library such as Leaflet or Mapbox
- Browser geolocation
- Audio recording in the browser, stored locally for the demo
- Whisper or a similar model for transcripts, with a simple keyword check for the crisis and naming rules

### Demo prep

Record 15 to 20 real echoes around the JMU campus before the pitch. The recordings carry the presentation. Play one aloud for the judges.

## Deliverables

1. **Website.** A short public-facing page explaining the idea.
2. **Local demo.** A locally hosted web app that shows the map, playback, heat map and Legends, plus the Maya story.
3. **Slide deck.** Slim and short. A suggested shape: problem, the Echoes idea, how it breaks the comfort zone (go, hear, say, receive), the Maya story, guardrails and honest positioning, then the close.

## Open questions

- Product name. "Echoes" is a working title.
- Final tech stack.
- Which JMU locations to seed first.
- Who records the seed echoes, and who plays the demo persona.
- Whether to build decay and the listen-before-posting rule or only describe them.
