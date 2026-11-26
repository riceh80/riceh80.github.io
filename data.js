/* ======================================================================
   Everything the site shows lives in this file.

   ADD A PERSON
     1. Copy the whole "darren" block below, paste it after it, and change
        the id (e.g. "alex") and the text.
     2. Add the id to `order`.
     3. Put their files in assets/people/<id>/
          photo.jpg            their photo (profile tile + top of their page)
          resume.pdf           optional résumé
          work/<key>.jpg       one picture per item key (e.g. work/tlc.jpg)
        Anything missing just falls back to an animated title card.

   Each item can have a `doodle` — the hand-drawn sketch shown until a picture
   is added — and a short handwritten `note`. Doodles:
     crate, d20, dungeon, browser, cards, wireframe, checklist, lobby, bracket, chat
   (checklist uses the item's `words` list)
   ====================================================================== */

window.SITE = {
  order: ['darren'],

  people: {
    darren: {
      name: 'Darren',
      fullName: 'Darren Hui',
      initials: 'DH',
      color: '#e50914',
      email: 'darrenhui01@gmail.com',
      linkedin: 'https://www.linkedin.com/in/darrenHui2005',
      github: 'https://github.com/riceh80',
      resume: 'assets/people/darren/resume.pdf',

      // Optional trailers / gameplay clips: 'assets/people/darren/work/tlc.mp4'
      videos: { tlc: '', dungeon: '', valentine: '', rogue: '' },
      // Live links (play it / visit it), shown on the card and in the details window
      links: {
        tlc: '', dungeon: '', rogue: '',
        valentine: 'https://riceh80.github.io/noob/',
        evu: 'https://www.elaview.com/',
        bbaweb: 'https://www.betterbklyn.org/',
        bbateach: 'https://www.betterbklyn.org/',
      },
      // GitHub repos for each project
      repos: {
        tlc: 'https://github.com/riceh80/Totally-Legal-Cargo',
        dungeon: 'https://github.com/riceh80/DnDGame',
        valentine: 'https://github.com/riceh80/noob',
        rogue: 'https://github.com/QuiteKewl/the-game',
      },
      // Repos that are private on GitHub show "Private repo · ask me" (it opens an email
      // to you) instead of a GitHub link. Make a repo public, then remove its key here.
      privateRepos: ['tlc', 'dungeon', 'rogue'],

      sideOrder: ['gamedev', 'webdev', 'teacher', 'esports'],
      sides: {
        gamedev: {
          label: 'Game Dev',
          title: 'I make games.',
          sub: 'Gameplay systems, VFX, SFX and trailers in Godot, Unity and Unreal Engine 5. Computer Science at the University at Buffalo, Class of 2027.',
          items: ['tlc', 'dungeon', 'rogue'],
        },
        webdev: {
          label: 'Web Dev',
          title: 'I build for the web.',
          sub: 'Pages, layouts and UI components in HTML, CSS and JavaScript. Right now I’m a Software Developer at EVU LLC.',
          items: ['evu', 'valentine', 'bbaweb'],
        },
        teacher: {
          label: 'Teacher',
          title: 'I teach people to code.',
          sub: 'I’ve taught a class of 16 students Python and spent four years supporting classrooms at Excel Learning Center in Brooklyn.',
          items: ['bbateach', 'excel', 'esl'],
        },
        esports: {
          label: 'Leadership',
          title: 'I run a 500‑member community.',
          sub: 'Bi‑weekly 10‑mans, tournaments and the Esports Discord. I lead the University at Buffalo Valorant community.',
          items: ['valorant', 'tenmans', 'discord'],
        },
      },

      projects: ['tlc', 'dungeon', 'valentine', 'rogue'],

      items: {
        tlc: {
          title: 'Totally Legal Cargo', meta: 'Godot · C# · Codex', date: 'Jul 2026 – Present', status: 'In development',
          color: '#3f3b26', doodle: 'crate', note: 'nothing to see here',
          caption: 'An AI‑assisted game in Godot. I direct Codex on the gameplay systems, then make the VFX, SFX and trailers myself.',
          line: 'An AI‑assisted game in Godot, with its own VFX, SFX and trailers.',
          summary: 'An AI‑assisted game built in Godot with C#. I direct Codex through structured prompts to generate and iterate on gameplay systems, then test, debug and integrate what it writes.',
          points: [
            'Directing Codex through structured prompts to generate and iterate on gameplay systems while testing, debugging and integrating the generated code.',
            'Created and integrated VFX, SFX, animations and gameplay feedback systems to improve presentation and overall game feel.',
            'Edited promotional gameplay footage and game trailers, combining gameplay clips, visual effects, sound design, transitions and pacing.',
          ],
          facts: [['Built with', 'C#, Godot, Codex'], ['Focus', 'Gameplay systems, game feel, VFX and SFX, trailers']],
          linkLabel: 'Watch the trailer',
        },
        dungeon: {
          title: 'Dungeon & Live', meta: 'Unreal Engine 5 · Blueprints', date: 'Feb 2026 – May 2026', status: 'Completed',
          color: '#1e1730', doodle: 'd20', note: 'roll me!',
          caption: 'Procedurally spawned trees and rocks, enemy and boss AI, and player combat, all built in Unreal Engine 5 Blueprints.',
          line: 'Procedural spawning, enemy AI and boss fights in Blueprints.',
          summary: 'A 3D game in Unreal Engine 5 built with Blueprints, from procedurally spawned scenery to enemy AI and boss attacks.',
          points: [
            'Developed gameplay systems including procedural spawning for trees and rocks, enemy and boss attack logic, AI movement, spawning behavior, and player combat and movement.',
            'Managed UI functionality, assigned animations to 3D models, and resolved bugs across multiple gameplay systems before the final build.',
          ],
          facts: [['Built with', 'Unreal Engine 5, Blueprints'], ['Focus', 'Procedural spawning, enemy and boss AI, combat, UI']],
          linkLabel: 'View project',
        },
        valentine: {
          title: 'Valentine Website', meta: 'HTML · CSS · JavaScript', date: 'Jan 2026', status: 'Deployed',
          color: '#6e1a33', doodle: 'browser', note: 'deployed!',
          caption: 'An interactive browser game with its own input handling and state, deployed on GitHub Pages.',
          line: 'An interactive browser game, deployed with GitHub Pages.',
          summary: 'An interactive, browser‑based Valentine game with a responsive UI and real‑time interaction logic.',
          points: [
            'Developed an interactive browser‑based game with responsive UI, user input handling, state management and real‑time interaction logic.',
            'Implemented button interactions, visual feedback and page behavior, then deployed the finished project through GitHub Pages.',
          ],
          facts: [['Built with', 'HTML, CSS, JavaScript, GitHub Pages'], ['Focus', 'Interaction, state management, deployment']],
          linkLabel: 'Play it',
        },
        rogue: {
          title: 'Rogue Card Game', meta: 'C# · JSON', date: 'Jun 2025', status: 'Enemy system',
          color: '#17332d', doodle: 'cards', note: 'stats live in JSON',
          caption: 'An enemy system driven by JSON, so stats and attacks can be balanced without touching the game’s code.',
          line: 'A JSON‑driven enemy system for a turn‑based roguelike.',
          summary: 'The enemy system for a turn‑based rogue card game, built so the game can be balanced by editing data instead of code.',
          points: [
            'Developed an enemy system with random enemy spawning, attack behavior and JSON‑based enemy data for easier balancing and customization.',
            'Stored enemy stats, attacks and types in external JSON files so gameplay data could be adjusted without changing core game code.',
          ],
          facts: [['Built with', 'C#, JSON'], ['Focus', 'Data‑driven design, enemy behavior, balancing']],
          linkLabel: 'View project',
        },
        evu: {
          title: 'EVU LLC', linkLabel: 'Visit elaview.com', meta: 'Software Developer', date: 'Oct 2026 – Present', status: 'Current role',
          color: '#17233a', doodle: 'wireframe', note: 'layouts + UI',
          caption: 'Updating pages, layouts and UI components, and helping a teammate track down and fix a malware issue on the site.',
          summary: 'Frontend work on the company website, from page layouts and UI components to testing fixes after updates.',
          points: [
            'Contributed to frontend development by updating website pages, layouts and user interface components to improve usability and consistency.',
            'Assisted a fellow developer in troubleshooting and resolving a website security issue involving malicious software.',
            'Collaborated with team members to identify technical issues, test fixes and make sure the website worked after updates.',
          ],
          facts: [['Role', 'Software Developer'], ['Focus', 'Frontend, UI consistency, site security']],
        },
        bbaweb: {
          title: 'Better Brooklyn Association', linkLabel: 'Visit betterbklyn.org', meta: 'Web Developer', date: 'Jul 2025 – Aug 2025', status: 'Summer role',
          color: '#22311f', doodle: 'wireframe', note: 'site updates',
          caption: 'Helped update the organization’s website, improving its content, structure and usability.',
          summary: 'Website updates for a Brooklyn community organization, alongside teaching a summer class.',
          points: [
            'Helped update the organization’s website, improving page content and supporting its overall structure and usability.',
            'Taught a class of 16 students Python, ELA and math.',
          ],
          facts: [['Role', 'Web Developer & Youth Instructor'], ['Focus', 'Page content, structure, usability']],
        },
        bbateach: {
          title: 'A class of 16', linkLabel: 'Visit Better Brooklyn', meta: 'Youth Instructor · Better Brooklyn Association', date: 'Jul 2025 – Aug 2025', status: 'Summer role',
          color: '#5a3a13', doodle: 'checklist',
          words: ['variables', 'loops', 'stacks', 'queues', 'functions', 'classes', 'dictionaries', 'arrays'],
          caption: 'Taught Python, ELA and math, from variables and loops to stacks, queues and classes, with live coding demos.',
          summary: 'A summer class of 16 students in Python, ELA and math, taught with live coding and practice problems.',
          points: [
            'Taught a class of 16 students Python, ELA and math, explaining variables, stacks, queues, loops, conditionals, functions, classes, dictionaries and arrays.',
            'Led live coding demonstrations and guided students through practice problems in real programs.',
          ],
          facts: [['Role', 'Youth Instructor'], ['Taught', 'Python, ELA, math']],
        },
        excel: {
          title: 'Excel Learning Center', meta: 'Brooklyn, NY', date: 'Jul 2022 – Aug 2026', status: '4 years',
          color: '#432319', doodle: 'checklist',
          words: ['homework', 'tests', 'essays', 'attendance'],
          caption: 'Four years supporting three classrooms of 6–15 students with homework, tests, essays and daily organization.',
          summary: 'Four years helping teachers run three classrooms in Brooklyn.',
          points: [
            'Assisted teachers across 3 classrooms, supporting groups of 6–15 students with homework, tests, essays, attendance tracking and daily classroom organization.',
            'Supported Chinese‑speaking ESL and immigrant students as they worked through assignments, practiced English and adjusted to classroom expectations.',
          ],
          facts: [['Where', 'Brooklyn, NY'], ['Class size', 'Groups of 6–15 students']],
        },
        esl: {
          title: 'ESL support', meta: 'Excel Learning Center', date: 'Jul 2022 – Aug 2026', status: '4 years',
          color: '#2b3047', doodle: 'checklist',
          words: ['understand', 'practice', 'adjust'],
          caption: 'Helping Chinese‑speaking ESL and immigrant students understand assignments, practice English and settle into class.',
          summary: 'Helping Chinese‑speaking ESL and immigrant students keep up with their work and adjust to the classroom.',
          points: [
            'Supported Chinese‑speaking ESL and immigrant students as they worked through assignments, practiced English and adjusted to classroom expectations.',
          ],
          facts: [['Where', 'Excel Learning Center, Brooklyn'], ['I speak', 'English, Cantonese']],
        },
        valorant: {
          title: 'UB Valorant', meta: 'Community Lead · University at Buffalo', date: 'Sep 2023 – May 2027', status: 'Leadership',
          color: '#330f17', doodle: 'lobby', note: '500 members',
          caption: 'Leading a 500‑member University at Buffalo Valorant community.',
          summary: 'I lead the University at Buffalo’s Valorant community: the events, the tournaments and the Discord.',
          points: [
            'Lead a 500‑member University at Buffalo Valorant community, hosting bi‑weekly 10‑man events and organizing tournaments and overflow groups.',
            'Moderate the Esports Discord server and maintain engagement, communication and community standards.',
          ],
          facts: [['Role', 'Valorant Esports Community Lead'], ['Members', '500']],
        },
        tenmans: {
          title: '10‑mans & tournaments', meta: 'UB Valorant', date: 'Sep 2023 – May 2027', status: 'Leadership',
          color: '#332310', doodle: 'bracket', note: 'bi-weekly',
          caption: 'Hosting bi‑weekly 10‑man events, organizing tournaments and running overflow groups.',
          summary: 'Regular in‑house games and tournaments for the UB Valorant community.',
          points: [
            'Host bi‑weekly 10‑man events and organize tournaments and overflow groups for a 500‑member community.',
          ],
          facts: [['Role', 'Valorant Esports Community Lead'], ['Schedule', 'Bi‑weekly 10‑mans']],
        },
        discord: {
          title: 'The Esports Discord', meta: 'UB Valorant', date: 'Sep 2023 – May 2027', status: 'Leadership',
          color: '#1d2040', doodle: 'chat', note: '#esports',
          caption: 'Moderating the Esports Discord server and keeping engagement, communication and community standards high.',
          summary: 'Keeping the UB Esports Discord organized, active and welcoming.',
          points: [
            'Moderate the Esports Discord server and maintain engagement, communication and community standards.',
          ],
          facts: [['Role', 'Valorant Esports Community Lead'], ['Focus', 'Moderation, communication, standards']],
        },
      },

      about: {
        // Handwritten notes around your name at the top of the About page
        // (up to four: top-left, top-right, bottom-left, bottom-right).
        notes: [
          ['studying CS at UB', 'class of ’27'],
          ['dev @ EVU LLC', 'since Oct 2026'],
          ['building Totally Legal Cargo', 'in Godot'],
          ['speaks English', '+ Cantonese'],
        ],
        // Words in [[double brackets]] are highlighted in red.
        story: 'Hey, I’m Darren. I’m a CS student at UB who likes making things, mostly [[games]] in Godot, Unity and Unreal, plus [[websites]] in HTML, CSS and JavaScript. I’ve taught a class of [[16 students]] to code, and on the side I run UB’s [[500‑member]] Valorant community.',
        stats: [
          ['500', 'members in the UB Valorant community I lead'],
          ['16', 'students in the Python, ELA and math class I taught'],
          ['4', 'years supporting classrooms at Excel Learning Center'],
          ['3', 'game engines: Godot, Unity and Unreal Engine 5'],
        ],
        experience: [
          {
            org: 'EVU LLC', when: 'Oct 2026 – Present', role: 'Software Developer',
            points: [
              'Updated website pages, layouts and user interface components to improve usability and consistency.',
              'Helped a fellow developer troubleshoot and resolve a website security issue involving malicious software.',
              'Worked with the team to identify technical issues, test fixes and make sure the site worked after updates.',
            ],
          },
          {
            org: 'Better Brooklyn Association', when: 'Jul 2025 – Aug 2025', role: 'Web Developer & Youth Instructor',
            points: [
              'Helped update the organization’s website, improving page content and supporting its overall structure and usability.',
              'Taught a class of 16 students Python, ELA and math, covering variables, stacks, queues, loops, conditionals, functions, classes, dictionaries and arrays.',
              'Led live coding demonstrations and guided students through practice problems in real programs.',
            ],
          },
          {
            org: 'University at Buffalo', when: 'Sep 2023 – May 2027', role: 'Valorant Esports Community Lead',
            points: [
              'Lead a 500‑member community, hosting bi‑weekly 10‑man events and organizing tournaments and overflow groups.',
              'Moderate the Esports Discord server and maintain engagement, communication and community standards.',
            ],
          },
          {
            org: 'Brooklyn, NY', when: 'Jul 2022 – Aug 2026', role: 'Excel Learning Center Inc.',
            points: [
              'Assisted teachers across 3 classrooms, supporting groups of 6–15 students with homework, tests, essays, attendance and daily organization.',
              'Supported Chinese‑speaking ESL and immigrant students as they worked through assignments, practiced English and adjusted to classroom expectations.',
            ],
          },
        ],
        specs: [
          ['Education', ['University at Buffalo', 'Bachelor of Science in Computer Science', 'Aug 2023 – May 2027 · Buffalo, NY']],
          ['Languages', ['Java', 'C#', 'Python', 'JavaScript', 'HTML', 'CSS']],
          ['Game engines', ['Godot', 'Unity', 'Unreal Engine 5']],
          ['Game development', ['Gameplay programming', 'AI‑assisted development', 'VFX and SFX', 'Animation', 'Video editing and game trailers']],
          ['Tools', ['Git and GitHub', 'VS Code', 'Microsoft Excel', 'Codex']],
          ['Operating systems', ['Linux', 'Windows']],
          ['Languages spoken', ['English', 'Cantonese']],
        ],
      },
    },
  },
};
