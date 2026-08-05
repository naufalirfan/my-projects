var roadmaps = {
  "Frontend Developer": {
    icon: "🎨",
    description: "Bangun website yang interaktif dan cantik",
    steps: [
      {
        title: "HTML & CSS Dasar",
        duration: "2 minggu",
        difficulty: "Mudah",
        description: "Pelajari struktur halaman web dan styling",
        resources: [
          { name: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Learn/HTML", type: "Docs" },
          { name: "freeCodeCamp HTML/CSS", url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/", type: "Kursus" },
          { name: "CSS-Tricks", url: "https://css-tricks.com/guides/", type: "Guide" }
        ],
        cheatsheet: "HTML: <div>, <p>, <a>, <img>, <form>, <input>, <button>\nCSS: display, flex, grid, position, margin, padding, color, font-size"
      },
      {
        title: "JavaScript Dasar",
        duration: "3 minggu",
        difficulty: "Mudah",
        description: "Bahasa pemrograman untuk web",
        resources: [
          { name: "JavaScript.info", url: "https://javascript.info/", type: "Tutorial" },
          { name: "Eloquent JavaScript", url: "https://eloquentjavascript.net/", type: "Buku" },
          { name: "30 Days of JavaScript", url: "https://github.com/Asabeneh/30-Days-Of-JavaScript", type: "Challenge" }
        ],
        cheatsheet: "let/const, function, array.map/filter/reduce, object, promise, async/await, DOM: getElementById, querySelector, addEventListener"
      },
      {
        title: "CSS Framework",
        duration: "1 minggu",
        difficulty: "Mudah",
        description: "Pilih satu framework: Tailwind atau Bootstrap",
        resources: [
          { name: "Tailwind CSS", url: "https://tailwindcss.com/docs", type: "Docs" },
          { name: "Bootstrap", url: "https://getbootstrap.com/docs/5.3/getting-started/introduction/", type: "Docs" }
        ],
        cheatsheet: "Tailwind: flex, grid, p-4, m-2, bg-blue-500, text-white, rounded, shadow\nBootstrap: container, row, col-md-6, btn, card, navbar"
      },
      {
        title: "React / Vue / Svelte",
        duration: "4 minggu",
        difficulty: "Menengah",
        description: "Pilih satu framework modern",
        resources: [
          { name: "React Docs", url: "https://react.dev/learn", type: "Docs" },
          { name: "Vue Tutorial", url: "https://vuejs.org/tutorial/", type: "Tutorial" },
          { name: "Svelte Tutorial", url: "https://svelte.dev/tutorial", type: "Tutorial" }
        ],
        cheatsheet: "React: useState, useEffect, props, JSX, component\nVue: ref, computed, template, v-if, v-for\nSvelte: $: reactive, {#if}, {#each}, on:click"
      },
      {
        title: "API & Fetch",
        duration: "1 minggu",
        difficulty: "Menengah",
        description: "Ambil data dari server",
        resources: [
          { name: "Fetch API", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API", type: "Docs" },
          { name: "JSONPlaceholder", url: "https://jsonplaceholder.typicode.com/", type: "Practice" }
        ],
        cheatsheet: "fetch(url).then(r => r.json()).then(data => ...)\nasync/await: const res = await fetch(url); const data = await res.json();"
      },
      {
        title: "Git & GitHub",
        duration: "3 hari",
        difficulty: "Mudah",
        description: "Version control untuk kode",
        resources: [
          { name: "Git Handbook", url: "https://guides.github.com/introduction/git-handbook/", type: "Guide" },
          { name: "Oh Shit Git", url: "https://ohshitgit.com/", type: "Cheat Sheet" }
        ],
        cheatsheet: "git init, git add ., git commit -m 'pesan', git push, git pull, git branch, git checkout -b nama-branch"
      },
      {
        title: "Project Portfolio",
        duration: "2 minggu",
        difficulty: "Menengah",
        description: "Bikin 2-3 project untuk portfolio",
        resources: [
          { name: "App Ideas", url: "https://github.com/florinpop17/app-ideas", type: "Ide Project" },
          { name: "Frontend Mentor", url: "https://www.frontendmentor.io/", type: "Challenge" }
        ],
        cheatsheet: "Ide: Todo App, Weather App, Calculator, Portfolio Website, E-commerce Landing Page"
      }
    ]
  },
  "Backend Developer": {
    icon: "⚙️",
    description: "Bangun server, API, dan database",
    steps: [
      {
        title: "JavaScript/Python Dasar",
        duration: "3 minggu",
        difficulty: "Mudah",
        description: "Pilih satu bahasa backend",
        resources: [
          { name: "Node.js Tutorial", url: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs", type: "Tutorial" },
          { name: "Python Tutorial", url: "https://docs.python.org/3/tutorial/", type: "Tutorial" }
        ],
        cheatsheet: "Node: require, module.exports, fs, http, path\nPython: def, class, import, list, dict, for, if"
      },
      {
        title: "HTTP & REST API",
        duration: "1 minggu",
        difficulty: "Mudah",
        description: "Cara kerja web dan API",
        resources: [
          { name: "MDN HTTP", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview", type: "Docs" },
          { name: "RESTful API Design", url: "https://restfulapi.net/", type: "Guide" }
        ],
        cheatsheet: "GET (ambil data), POST (buat baru), PUT (update), DELETE (hapus)\nStatus: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Error"
      },
      {
        title: "Express.js / FastAPI",
        duration: "2 minggu",
        difficulty: "Menengah",
        description: "Framework untuk bikin API",
        resources: [
          { name: "Express Guide", url: "https://expressjs.com/en/guide/routing.html", type: "Docs" },
          { name: "FastAPI Tutorial", url: "https://fastapi.tiangolo.com/tutorial/", type: "Tutorial" }
        ],
        cheatsheet: "Express: app.get(), app.post(), req.params, req.body, res.json()\nFastAPI: @app.get('/'), @app.post('/'), def func(param: type)"
      },
      {
        title: "Database (SQL + NoSQL)",
        duration: "2 minggu",
        difficulty: "Menengah",
        description: "PostgreSQL & MongoDB",
        resources: [
          { name: "SQL Tutorial", url: "https://www.sqltutorial.org/", type: "Tutorial" },
          { name: "MongoDB University", url: "https://learn.mongodb.com/", type: "Kursus" }
        ],
        cheatsheet: "SQL: SELECT, INSERT, UPDATE, DELETE, JOIN, WHERE, GROUP BY\nMongoDB: find(), insertOne(), updateOne(), deleteOne(), aggregate()"
      },
      {
        title: "Authentication & Security",
        duration: "1 minggu",
        difficulty: "Menengah",
        description: "JWT, OAuth, hashing password",
        resources: [
          { name: "JWT.io", url: "https://jwt.io/introduction", type: "Docs" },
          { name: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/", type: "Security" }
        ],
        cheatsheet: "JWT: header.payload.signature\nbcrypt: hash password sebelum simpan\nCORS: atur origin yang boleh akses API"
      },
      {
        title: "Docker Dasar",
        duration: "1 minggu",
        difficulty: "Menengah",
        description: "Container untuk deploy aplikasi",
        resources: [
          { name: "Docker Getting Started", url: "https://docs.docker.com/get-started/", type: "Tutorial" },
          { name: "Play with Docker", url: "https://labs.play-with-docker.com/", type: "Lab" }
        ],
        cheatsheet: "docker build -t nama ., docker run -p 3000:3000 nama, docker ps, docker stop, Dockerfile: FROM, RUN, COPY, CMD"
      },
      {
        title: "Project: REST API",
        duration: "2 minggu",
        difficulty: "Menengah",
        description: "Bikin API lengkap dengan CRUD",
        resources: [
          { name: "Build a REST API", url: "https://www.theodinproject.com/paths/full-stack-javascript/courses/nodejs", type: "Project" }
        ],
        cheatsheet: "CRUD: Create (POST), Read (GET), Update (PUT), Delete (DELETE)\nStruktur: routes/ controllers/ models/ middleware/"
      }
    ]
  },
  "DevOps Engineer": {
    icon: "🚀",
    description: "Deploy, monitor, dan manage infrastruktur",
    steps: [
      {
        title: "Linux Command Line",
        duration: "1 minggu",
        difficulty: "Mudah",
        description: "Dasar-dasar terminal Linux",
        resources: [
          { name: "Linux Journey", url: "https://linuxjourney.com/", type: "Tutorial" },
          { name: "The Linux Command Line", url: "https://linuxcommand.org/tlcl.php", type: "Buku" }
        ],
        cheatsheet: "ls, cd, pwd, mkdir, rm, cp, mv, cat, grep, chmod, ssh, curl, wget"
      },
      {
        title: "Networking Dasar",
        duration: "1 minggu",
        difficulty: "Mudah",
        description: "TCP/IP, DNS, HTTP, port",
        resources: [
          { name: "Computer Networking Course", url: "https://www.youtube.com/watch?v=IPvYjXqTGBs", type: "Video" }
        ],
        cheatsheet: "IP: alamat komputer, Port: pintu masuk service\nDNS: domain → IP, HTTP: protokol web\nping, traceroute, netstat, ss"
      },
      {
        title: "Docker & Container",
        duration: "2 minggu",
        difficulty: "Menengah",
        description: "Containerisasi aplikasi",
        resources: [
          { name: "Docker Docs", url: "https://docs.docker.com/", type: "Docs" },
          { name: "Docker Curriculum", url: "https://docker-curriculum.com/", type: "Tutorial" }
        ],
        cheatsheet: "docker build, docker run, docker-compose up, Dockerfile, volumes, networks, images"
      },
      {
        title: "Kubernetes Dasar",
        duration: "3 minggu",
        difficulty: "Sulit",
        description: "Orkestrasi container",
        resources: [
          { name: "Kubernetes Tutorial", url: "https://kubernetes.io/docs/tutorials/", type: "Tutorial" },
          { name: "Minikube", url: "https://minikube.sigs.k8s.io/docs/start/", type: "Lab" }
        ],
        cheatsheet: "Pod, Deployment, Service, Namespace\nkubectl get pods, kubectl apply -f, kubectl logs, kubectl exec"
      },
      {
        title: "CI/CD Pipeline",
        duration: "1 minggu",
        difficulty: "Menengah",
        description: "GitHub Actions, GitLab CI",
        resources: [
          { name: "GitHub Actions", url: "https://docs.github.com/en/actions", type: "Docs" },
          { name: "GitHub Actions Tutorial", url: "https://www.youtube.com/watch?v=R8_veQiYBjI", type: "Video" }
        ],
        cheatsheet: "on: push/pull_request, jobs: build/test/deploy, steps: uses/run\n.github/workflows/ci.yml"
      },
      {
        title: "Cloud Platform",
        duration: "2 minggu",
        difficulty: "Menengah",
        description: "AWS / GCP / Azure basics",
        resources: [
          { name: "AWS Free Tier", url: "https://aws.amazon.com/free/", type: "Free" },
          { name: "Google Cloud Training", url: "https://cloud.google.com/training", type: "Kursus" }
        ],
        cheatsheet: "AWS: EC2, S3, RDS, Lambda, IAM\nGCP: Compute Engine, Cloud Storage, Cloud SQL"
      },
      {
        title: "Monitoring & Logging",
        duration: "1 minggu",
        difficulty: "Menengah",
        description: "Prometheus, Grafana, ELK",
        resources: [
          { name: "Prometheus", url: "https://prometheus.io/docs/introduction/overview/", type: "Docs" },
          { name: "Grafana", url: "https://grafana.com/docs/grafana/latest/", type: "Docs" }
        ],
        cheatsheet: "Prometheus: metrics, alerts, query (PromQL)\nGrafana: dashboard, panels, data source\nLogs: application logs → centralized logging"
      }
    ]
  },
  "Mobile Developer": {
    icon: "📱",
    description: "Bangun aplikasi Android & iOS",
    steps: [
      {
        title: "JavaScript / Dart Dasar",
        duration: "2 minggu",
        difficulty: "Mudah",
        description: "Bahasa untuk React Native atau Flutter",
        resources: [
          { name: "JavaScript.info", url: "https://javascript.info/", type: "Tutorial" },
          { name: "Dart Language", url: "https://dart.dev/language", type: "Docs" }
        ],
        cheatsheet: "JS: let/const, function, array, object, async/await\nDart: var, final, class, void, Future, List, Map"
      },
      {
        title: "React Native / Flutter",
        duration: "4 minggu",
        difficulty: "Menengah",
        description: "Pilih framework mobile cross-platform",
        resources: [
          { name: "React Native Docs", url: "https://reactnative.dev/docs/getting-started", type: "Docs" },
          { name: "Flutter Docs", url: "https://docs.flutter.dev/get-started/install", type: "Docs" }
        ],
        cheatsheet: "RN: <View>, <Text>, <TouchableOpacity>, StyleSheet, useState\nFlutter: Widget, StatelessWidget, StatefulWidget, MaterialApp, Scaffold"
      },
      {
        title: "Navigation & State",
        duration: "2 minggu",
        difficulty: "Menengah",
        description: "Routing dan manajemen state",
        resources: [
          { name: "React Navigation", url: "https://reactnavigation.org/docs/getting-started/", type: "Docs" },
          { name: "Flutter State", url: "https://docs.flutter.dev/data-and-backend/state-mgmt/intro", type: "Docs" }
        ],
        cheatsheet: "RN: Stack.Navigator, Tab.Navigator, useContext, Redux\nFlutter: Navigator.push, Provider, Riverpod, Bloc"
      },
      {
        title: "API & Backend",
        duration: "1 minggu",
        difficulty: "Menengah",
        description: "Connect ke backend",
        resources: [
          { name: "Fetch API", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API", type: "Docs" }
        ],
        cheatsheet: "fetch() → JSON → setState/StatefulWidget\nDio (Flutter): Dio().get(url), interceptors"
      },
      {
        title: "Local Storage",
        duration: "3 hari",
        difficulty: "Mudah",
        description: "Simpan data di device",
        resources: [
          { name: "AsyncStorage", url: "https://react-native-async-storage.github.io/async-storage/", type: "Docs" },
          { name: "Sqflite", url: "https://pub.dev/packages/sqflite", type: "Package" }
        ],
        cheatsheet: "RN: AsyncStorage.setItem/getItem/removeItem\nFlutter: SharedPreferences, sqflite, hive"
      },
      {
        title: "Publish ke Play Store / App Store",
        duration: "1 minggu",
        difficulty: "Menengah",
        description: "Deploy aplikasi ke store",
        resources: [
          { name: "Play Console", url: "https://support.google.com/googleplay/android-developer/answer/9859152", type: "Guide" },
          { name: "App Store Connect", url: "https://developer.apple.com/help/app-store-connect/", type: "Guide" }
        ],
        cheatsheet: "Build APK/IPA → Upload ke Console → Isi listing → Submit review → Publish"
      }
    ]
  },
  "AI / ML Engineer": {
    icon: "🤖",
    description: "Bangun model AI dan machine learning",
    steps: [
      {
        title: "Python Dasar",
        duration: "2 minggu",
        difficulty: "Mudah",
        description: "Bahasa utama untuk AI/ML",
        resources: [
          { name: "Python Tutorial", url: "https://docs.python.org/3/tutorial/", type: "Tutorial" },
          { name: "Automate Boring Stuff", url: "https://automatetheboringstuff.com/", type: "Buku" }
        ],
        cheatsheet: "def, class, list, dict, for, if, import, pip install, numpy, pandas"
      },
      {
        title: "Matematika untuk ML",
        duration: "2 minggu",
        difficulty: "Menengah",
        description: "Linear algebra, statistik, calculus",
        resources: [
          { name: "3Blue1Brown Linear Algebra", url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab", type: "Video" },
          { name: "StatQuest", url: "https://www.youtube.com/c/joshstarmer", type: "Video" }
        ],
        cheatsheet: "Matrix: perkalian, transpose, inverse\nStatistik: mean, median, std dev, probability\nCalculus: turunan, gradien, gradient descent"
      },
      {
        title: "NumPy & Pandas",
        duration: "1 minggu",
        difficulty: "Menengah",
        description: "Data manipulation & analysis",
        resources: [
          { name: "NumPy Tutorial", url: "https://numpy.org/doc/stable/user/quickstart.html", type: "Tutorial" },
          { name: "Pandas Tutorial", url: "https://pandas.pydata.org/docs/getting_started/intro_tutorials/", type: "Tutorial" }
        ],
        cheatsheet: "NumPy: np.array(), np.mean(), np.dot(), np.reshape()\nPandas: pd.read_csv(), df.head(), df.describe(), df.groupby()"
      },
      {
        title: "Scikit-Learn",
        duration: "2 minggu",
        difficulty: "Menengah",
        description: "ML klasik: regresi, klasifikasi, clustering",
        resources: [
          { name: "Scikit-Learn Tutorial", url: "https://scikit-learn.org/stable/tutorial/index.html", type: "Tutorial" },
          { name: "Kaggle Learn", url: "https://www.kaggle.com/learn", type: "Kursus" }
        ],
        cheatsheet: "model = LinearRegression(), model.fit(X_train, y_train), model.predict(X_test)\nPipeline: SimpleImputer → StandardScaler → Classifier"
      },
      {
        title: "Deep Learning (TensorFlow / PyTorch)",
        duration: "3 minggu",
        difficulty: "Sulit",
        description: "Neural networks untuk image, text, dll",
        resources: [
          { name: "TensorFlow Tutorial", url: "https://www.tensorflow.org/tutorials", type: "Tutorial" },
          { name: "PyTorch Tutorial", url: "https://pytorch.org/tutorials/", type: "Tutorial" }
        ],
        cheatsheet: "TF: tf.keras.Sequential, Dense, Conv2D, compile, fit\nPyTorch: nn.Module, nn.Linear, forward(), optimizer, loss"
      },
      {
        title: "LLM & Prompt Engineering",
        duration: "1 minggu",
        difficulty: "Menengah",
        description: "Working with large language models",
        resources: [
          { name: "OpenAI Cookbook", url: "https://cookbook.openai.com/", type: "Guide" },
          { name: "LangChain", url: "https://python.langchain.com/docs/get_started/introduction", type: "Docs" }
        ],
        cheatsheet: "Prompt: system → user → assistant\nRAG: retrieve relevant docs → inject into prompt\nLangChain: LLMChain, Agent, Tool, Memory"
      },
      {
        title: "Project: End-to-End ML",
        duration: "2 minggu",
        difficulty: "Sulit",
        description: "Bikin project ML lengkap",
        resources: [
          { name: "Kaggle Competitions", url: "https://www.kaggle.com/competitions", type: "Practice" },
          { name: "Made With ML", url: "https://madewithml.com/", type: "Kursus" }
        ],
        cheatsheet: "Pipeline: Data → Preprocess → Train → Evaluate → Deploy\nMetrics: accuracy, precision, recall, F1, AUC-ROC"
      }
    ]
  }
};