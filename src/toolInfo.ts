export interface ToolInfo {
  id: string;
  number: string;
  title: string;
  badge: string;
  accentColor: string;
  bgLightColor: string;
  simpleExplanation: string;
  technicalDetails: {
    overview: string;
    keyMechanisms: { title: string; desc: string }[];
    diagram: string;
    benefits: string[];
  };
}

export const TOOLS_DATABASE: Record<string, ToolInfo> = {
  tool1: {
    id: "tool1",
    number: "Outil 1",
    title: "Imageur de Sauvetage Lecture Seule",
    badge: "Copie Binaire F_NOCACHE & Images macOS",
    accentColor: "text-[#FBBF24]",
    bgLightColor: "bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30",
    simpleExplanation:
      "Crée une image de sauvetage en lecture seule (.dmg via hdiutil pour les volumes montés, ou .img binaire pour les images brutes) sur un autre disque sans jamais écrire sur le support source.",
    technicalDetails: {
      overview:
        "Extraction séquentielle non bufferisée (F_NOCACHE) pour les fichiers/images brutes avec contournement adaptatif des erreurs de lecture, ou création d'image UDRO lecture seule via macOS hdiutil pour les volumes montés.",
      keyMechanisms: [
        {
          title: "Saut adaptatif sur erreur de lecture (images brutes)",
          desc: "En cas d'erreur d'E/S sur une image brute ou un périphérique lisible, le moteur calcule un saut S_k = min(S_max, S_0 * 2^k) et consigne les blocs manquants dans le fichier .hrmap.json.",
        },
        {
          title: "Montage Finder en lecture seule",
          desc: "Les images créées peuvent être montées avec `hdiutil attach -readonly` pour explorer leur contenu sans solliciter le support d'origine.",
        },
      ],
      diagram:
        "Support Source (Lecture Seule) -> Copie / Image UDRO ou .img -> Verification F_NOCACHE -> Montage Read-Only",
      benefits: [
        "Aucune écriture effectuée sur le support source.",
        "Journal de secteurs et progression enregistré en JSON.",
      ],
    },
  },

  tool2: {
    id: "tool2",
    number: "Outil 2",
    title: "Analyseur d'Arborescence ExFAT & Corbeilles",
    badge: "Lecture Directe d'Entrées & Récupération",
    accentColor: "text-[#34D399]",
    bgLightColor: "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30",
    simpleExplanation:
      "Explore les volumes montés (y compris les dossiers cachés .Trashes et .Trash) ainsi que les tables d'entrées ExFAT dans les images disque brutes pour retrouver vos médias et noms d'origine.",
    technicalDetails: {
      overview:
        "Parcours non destructif des volumes accessibles et décodage des jeux d'entrées de répertoires ExFAT (0x85 / 0x05, 0xC0, 0xC1) à l'intérieur des images disque.",
      keyMechanisms: [
        {
          title: "Restitution d'entrées ExFAT",
          desc: "Décode les entrées UTF-16LE et longueurs de fichiers issues des tables de répertoires ExFAT présentes dans une image disque.",
        },
        {
          title: "Exploration des corbeilles volume",
          desc: "Scanne également `.Trashes` et `.Trash` tout en filtrant les métadonnées parasites AppleDouble (`._*`).",
        },
      ],
      diagram: "Volume ou Image Disque -> Lecture Entrées ExFAT / .Trashes -> Export vers Disque Sain",
      benefits: [
        "Bloque strictement l'exportation vers le support source.",
        "Préserve les noms de fichiers originaux quand l'annuaire est lisible.",
      ],
    },
  },

  tool3: {
    id: "tool3",
    number: "Outil 3",
    title: "Moteur de File Carving par Signatures",
    badge: "Extraction d'En-têtes & Tailles Réelles",
    accentColor: "text-[#F59E0B]",
    bgLightColor: "bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30",
    simpleExplanation:
      "Recherche les signatures binaires de photos JPEG (FF D8 FF ... FF D9) et de conteneurs vidéo ISO-BMFF (.MOV/.MP4 'ftyp') à l'intérieur d'une image disque brute pour en extraire les octets réels.",
    technicalDetails: {
      overview:
        "Analyse binaire par signatures magiques, mesure de l'entropie de Shannon et parcours des atomes racine ISO-BMFF ou du marqueur de fin JPEG EOI (FF D9).",
      keyMechanisms: [
        {
          title: "Mesure de taille réelle",
          desc: "Pour chaque signature JPEG, localise le marqueur de fin FF D9 ; pour chaque signature QuickTime/MP4, additionne les tailles d'atomes contigus afin d'extraire la plage exacte d'octets.",
        },
        {
          title: "Scoring de continuité par divergence de Jensen-Shannon",
          desc: "Évalue la cohérence statistique entre blocs adjacents grâce au module `math_engine`.",
        },
      ],
      diagram: "Image Brute -> Recherche Signatures (ftyp / FF D8 FF) -> Mesure Taille -> Extraction Plage d'Octets",
      benefits: [
        "Extraction directe des vrais octets depuis l'offset détecté dans l'image.",
        "Calcul d'entropie et détection des fichiers proxys (.THM / .LRF).",
      ],
    },
  },

  tool4: {
    id: "tool4",
    number: "Outil 4",
    title: "Réparation de Conteneurs Vidéo Sans Ré-encodage",
    badge: "Reconstruction d'Atomes moov / stbl",
    accentColor: "text-[#60A5FA]",
    bgLightColor: "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30",
    simpleExplanation:
      "Répare les rushs vidéo (.MOV, .MP4, .BRAW, .MXF) dont l'index `moov` est manquant ou tronqué suite à une coupure caméra, en s'appuyant sur les trames `mdat` et un éventuel fichier sain de référence.",
    technicalDetails: {
      overview:
        "Chirurgie binaire des conteneurs ISO-BMFF / QuickTime : reconstruction de l'annuaire `moov` et des tables `stsd`, `stsz`, `co64` sans toucher aux images vidéo d'origine.",
      keyMechanisms: [
        {
          title: "Mode Référence ou Autonome",
          desc: "Duplique les descriptions codec (`avcC`, `hvcC`, `apch`) depuis un fichier sain de la même caméra ou détecte les unités NAL/ProRes directement dans le flux `mdat`.",
        },
        {
          title: "Synchronisation Audio / Vidéo",
          desc: "Recalcule les tables d'échantillons pour restaurer la lecture dans QuickTime, DaVinci Resolve et Final Cut Pro.",
        },
      ],
      diagram: "Fichier Corrompu (mdat sans moov) + Référence Optionnelle -> Synthèse moov -> Nouveau Fichier Lisible",
      benefits: [
        "Aucune perte de qualité : zéro ré-encodage vidéo.",
        "Le fichier source d'origine n'est jamais modifié sur place.",
      ],
    },
  },

  tool5: {
    id: "tool5",
    number: "Outil 5",
    title: "Réparation Photo RAW & JPEG",
    badge: "Restauration Structurelle TIFF/IFD & Aperçu",
    accentColor: "text-[#A78BFA]",
    bgLightColor: "bg-[#8B5CF6]/15 text-[#C4B5FD] border-[#8B5CF6]/30",
    simpleExplanation:
      "Inspecte les en-têtes TIFF/IFD des fichiers RAW (.ARW, .CR3, .NEF, .DNG) et JPEG corrompus, répare la structure ou extrait le flux JPEG intégré lorsque l'image brute est endommagée.",
    technicalDetails: {
      overview:
        "Analyse structurelle des pointeurs IFD0/ExifIFD et extraction des segments JPEG embarqués.",
      keyMechanisms: [
        {
          title: "Vérification d'en-tête TIFF & JPEG",
          desc: "Contrôle l'alignement des marqueurs SOI/EOI et des répertoires IFD.",
        },
        {
          title: "Récupération d'aperçu intégré",
          desc: "Extrait l'image JPEG pleine résolution intégrée dans les RAW capteurs en cas d'endommagement de la matrice.",
        },
      ],
      diagram: "Photo RAW / JPEG -> Diagnostic IFD & Marqueurs -> Réparation ou Extraction JPEG",
      benefits: [
        "Compatible Sony ARW, Canon CR2/CR3, Nikon NEF, DNG et JPEG.",
      ],
    },
  },

  tool6: {
    id: "tool6",
    number: "Outil 6",
    title: "Réparateur Audio Broadcast (WAV / BWF)",
    badge: "Reconstruction d'En-tête RIFF & Inférence PCM",
    accentColor: "text-[#38BDF8]",
    bgLightColor: "bg-[#0284C7]/15 text-[#38BDF8] border-[#0284C7]/30",
    simpleExplanation:
      "Répare les fichiers audio .WAV et .BWF coupés en cours d'enregistrement en recalculant la taille exacte des chunks RIFF/data sans ré-encodage.",
    technicalDetails: {
      overview:
        "Recalcul des tailles RIFF et `data` et estimation statistique de la configuration PCM par autocorrélation quand l'en-tête est absent.",
      keyMechanisms: [
        {
          title: "Correction de chunk data",
          desc: "Remplace les longueurs nulles ou à `0xFFFFFFFF` par la taille réelle du flux PCM mesurée sur disque.",
        },
        {
          title: "Inférence PCM",
          desc: "Analyse l'écart inter-échantillons pour estimer la profondeur en bits et le nombre de canaux.",
        },
      ],
      diagram: "WAV/BWF Tronqué -> Mesure Taille Réelle + Autocorrélation PCM -> En-tête RIFF Valide",
      benefits: [
        "Restaure instantanément la lisibilité dans Pro Tools, Logic Pro et DaVinci Resolve.",
      ],
    },
  },

  tool7: {
    id: "tool7",
    number: "Outil 7",
    title: "Profilage de Latence de Lecture (F_NOCACHE)",
    badge: "Mesure Physique Non Destructive & S.M.A.R.T.",
    accentColor: "text-[#60A5FA]",
    bgLightColor: "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30",
    simpleExplanation:
      "Mesure le temps réel de lecture physique en microsecondes sur les fichiers présents sur le support (en contournant le cache RAM macOS via F_NOCACHE) et relève l'état S.M.A.R.T. remonté par macOS.",
    technicalDetails: {
      overview:
        "Échantillonnage jusqu'à 240 lectures directes de 64 Ko réparties sur les fichiers du support avec `F_NOCACHE` activé, calcul des percentiles et de l'entropie de Shannon, sans aucune écriture.",
      keyMechanisms: [
        {
          title: "Classification par latence mesurée",
          desc: "Rapide (< 1 ms), Normale (1-10 ms), Lente (10-50 ms), Critique (>= 50 ms ou erreur I/O). En cas de doute, une sonde secondaire de 16 pages 4K est exécutée sur la zone.",
        },
        {
          title: "Lecture seule stricte",
          desc: "Contrairement à un test d'écriture/relecture (disponible dans HardHub sur support non sensible), cet outil n'écrit aucun octet sur votre média.",
        },
      ],
      diagram: "Volume Source (Read-Only) -> Jusqu'à 240 Lectures F_NOCACHE -> Moyenne, P99, Entropie & S.M.A.R.T.",
      benefits: [
        "100% sûr : aucune écriture sur la carte ou le disque analysé.",
        "Met en évidence les ralentissements de lecture réels avant sauvegarde.",
      ],
    },
  },
};
