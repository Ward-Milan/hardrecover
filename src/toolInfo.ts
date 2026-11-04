export interface ToolInfo {
  id: string;
  number: string;
  title: string;
  badge: string;
  accentColor: string; // Tailwind color class like 'text-[#FBBF24]', 'text-[#60A5FA]', etc.
  bgLightColor: string; // Tailwind background class for icon badge
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
    title: "Cloneur Forensique Adaptatif (5 Passes)",
    badge: "Sauvetage Multi-Passes & Saut Exponentiel",
    accentColor: "text-[#FBBF24]",
    bgLightColor: "bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30",
    simpleExplanation:
      "Si votre carte SD ou disque dur commence à faiblir et fait planter votre Mac lors d'une copie, cet outil extrait vos données en sécurité vers un fichier image (.img). Au lieu d'insister bêtement sur les secteurs morts (ce qui risquerait d'achever le disque), il saute immédiatement par-dessus la panne pour copier d'abord tout ce qui est en bon état, puis revient détourer les dégâts avec une extrême précaution.",
    technicalDetails: {
      overview:
        "Cloneur bas niveau conçu pour contourner les blocages du noyau macOS. Il communique directement avec le périphérique brut via `/dev/rdisk*` en mode non bufferisé (`F_NOCACHE`), empêchant le système d'exploitation de figer l'ordinateur lors des erreurs d'E/S (I/O Errors).",
      keyMechanisms: [
        {
          title: "Phase 1 — Balayage Rapide (Fast Sweep)",
          desc: "Lecture par blocs de grande taille (ex. 1 Mo). Dès qu'un bloc met plus de temps que la normale ou échoue, le moteur applique un saut exponentiel (S_k = S_0 × 2^k) vers l'avant pour sauver immédiatement les zones saines restantes.",
        },
        {
          title: "Phase 2 & 3 — Détourage (Trimming) & Grattage (Scraping)",
          desc: "Le moteur revient aux frontières des zones sautées, d'avant en arrière, pour isoler précisément le premier et le dernier secteur défectueux au secteur près (512 ou 4096 octets).",
        },
        {
          title: "Phase 4 & 5 — Réessai Ciblé & Remplissage Neutre",
          desc: "Réessais ciblés uniquement sur les en-têtes critiques. Les secteurs irrémédiablement morts sont comblés par des octets neutres 0x00 et consignés dans un journal forensique `.hrmap` pour que la récupération sache exactement quelles données manquent.",
        },
      ],
      diagram: `+-------------------------------------------------------------+
|               PIPELINE DE CLONAGE ADAPTATIF 5 PASSES        |
+-------------------------------------------------------------+
 [LBA 0] ========[Secteurs Sains (100% Débit)]========> [Erreur LBA]
                                                              |
                                             +----------------+
                                             | Saut Exponentiel S_k
                                             v
 [LBA Saut] ====[Suite des zones saines sauvées]=======> [Fin Disque]
                                                              |
   Phase 2 (Trimming) <---------------------------------------+
   Phase 3 (Scraping granulaire 512o / 4Ko)
   Phase 4 (Targeted Retry)
   Phase 5 (Génération du fichier .img + journal .hrmap)`,
      benefits: [
        "Sauve 90% à 99% des données saines avant que le support ne rende l'âme.",
        "Zéro blocage ou gel du Mac grâce aux appels POSIX asynchrones non mis en cache.",
        "Reprise possible à tout moment grâce au journal de progression `.hrmap`.",
      ],
    },
  },

  tool2: {
    id: "tool2",
    number: "Outil 2",
    title: "Chirurgien de Partitions & Systèmes de Fichiers",
    badge: "Reconstruction GPT / ExFAT / APFS",
    accentColor: "text-[#34D399]",
    bgLightColor: "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30",
    simpleExplanation:
      "Rend de nouveau lisible un support qui affiche « Disque non initialisé » ou « Illisible » après un retrait sans éjection ou une coupure de courant. Il répare l'annuaire et la table des matières de la carte sans effacer vos fichiers.",
    technicalDetails: {
      overview:
        "Restauration géométrique et binaire des structures de boot et d'annuaires de systèmes de fichiers (ExFAT, FAT32, APFS, HFS+, GPT) sans toucher aux données utilisateur.",
      keyMechanisms: [
        {
          title: "Restauration VBR ExFAT (Backup VBR Copy)",
          desc: "Sur ExFAT, les secteurs 0 à 11 contiennent le Volume Boot Record principal, et les secteurs 12 à 23 contiennent une copie de secours exacte. Le moteur compare les deux, recalcule le checksum 32-bit (secteur 11) et restaure le boot record sans formatage.",
        },
        {
          title: "Synchronisation GPT Primaire & Secondaire",
          desc: "Vérifie l'en-tête de partition GUID (LBA 1) contre le backup situé au dernier secteur du disque (LBA N-1). En cas d'altération, la table des partitions est resynchronisée avec recalcul des sommes CRC32.",
        },
        {
          title: "Montage Virtuel en Mémoire Vive (RAM)",
          desc: "Permet de naviguer dans les dossiers et d'extraire les fichiers d'un disque endommagé en prévisualisation mémoire sans écrire un seul octet physique sur le support d'origine.",
        },
      ],
      diagram: `+-------------------------------------------------------------+
|             RECONSTRUCTION STRUCTURELLE EXFAT / GPT         |
+-------------------------------------------------------------+
 [LBA 0-11: VBR Primaire Corrompu]    [LBA 12-23: Backup VBR Sain]
             |                                    |
             | <-------- Copie & Validation ------+
             v           du Checksum 32-bit
 [Boot Record Réhabilité] ===> Volume à nouveau montable & lisible`,
      benefits: [
        "Récupère instantanément l'accès à vos fichiers sans passer par un scan de plusieurs heures.",
        "Conserve l'arborescence des dossiers et les noms d'origine des fichiers.",
        "Totalement non destructif pour les médias stockés.",
      ],
    },
  },

  tool3: {
    id: "tool3",
    number: "Outil 3",
    title: "Moteur de File Carving Vectoriel & Défragmenteur",
    badge: "Extraction Brute SIMD & Réassemblage",
    accentColor: "text-[#F59E0B]",
    bgLightColor: "bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30",
    simpleExplanation:
      "Si la carte a été formatée par erreur ou si le système de fichiers est totalement anéanti, ce moteur fouille chaque recoin brut du disque. Il reconnaît la signature de chaque type de fichier (vidéos, photos RAW, sons) et les réassemble même si la caméra les a éparpillés en morceaux sur la carte.",
    technicalDetails: {
      overview:
        "Moteur de fouille binaire brute ultra-rapide optimisé avec les instructions SIMD Apple Silicon (ARM NEON), capable d'ingérer plus de 3 Go/s de données brutes pour extraire les flux multimédias orphelins.",
      keyMechanisms: [
        {
          title: "Balayage Multi-Signatures Aho-Corasick",
          desc: "Reconnaissance simultanée en un seul passage mémoire de plus de 60 signatures binaires (Magic Bytes) d'en-têtes et pieds de page (.MOV, .MP4, .BRAW, .ARW, .CR3, .WAV...).",
        },
        {
          title: "Défragmentation par Entropie de Shannon",
          desc: "Sur les cartes ExFAT de caméras, la vidéo et l'audio sont souvent entrelacés dans des blocs séparés. Le moteur calcule l'entropie H(C) = -∑ p(x) log2 p(x) et détecte les unités NAL H.264/H.265 pour recoller les fragments du même clip vidéo dans l'ordre chronologique.",
        },
      ],
      diagram: `+-------------------------------------------------------------+
|              CARVING SIMD & DÉFRAGMENTATION MULTIMÉDIA       |
+-------------------------------------------------------------+
 Flux Brut LBA : [Video Frag 1] [Audio Frag 1] [Proxy Frag 1] [Video Frag 2]
                       |              |              |              |
 Entropie Shannon ===> [H = 7.82]     [H = 6.45]     [H = 7.10]     [H = 7.84]
 NAL Parser     ===> [Slice NAL]     [PCM Samples]  [Low-Res NAL]  [Slice NAL]
                       |                                            |
 Assemblage    ====> +--------------------------------------------+
                     v
             [Clip Vidéo Complet Reconstitué Sans Rupture]`,
      benefits: [
        "Récupère les vidéos fragmentées qui coupent d'habitude après 1 seconde avec les logiciels classiques.",
        "Scanne à la vitesse matérielle maximale de votre lecteur de carte ou port Thunderbolt.",
        "Capacité de prévisualiser les fichiers trouvés avant même de les exporter.",
      ],
    },
  },

  tool4: {
    id: "tool4",
    number: "Outil 4",
    title: "Synthétiseur Chirurgical de Conteneurs Vidéo",
    badge: "Reconstruction d'Atome moov Sans Ré-encodage",
    accentColor: "text-[#60A5FA]",
    bgLightColor: "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30",
    simpleExplanation:
      "Répare les vidéos (.MOV, .MP4, .MXF, .BRAW) qui refusent de s'ouvrir parce que la caméra a été éteinte brusquement ou que la batterie est tombée à plat pendant le tournage. Il reconstruit l'en-tête technique sans toucher à l'image : zéro perte de qualité, réparation en 2 secondes.",
    technicalDetails: {
      overview:
        "Chirurgie binaire des conteneurs ISO-BMFF / QuickTime. Dans un fichier vidéo corrompu, 99.9% des images sont intactes dans le bloc `mdat`, mais l'annuaire d'indexation `moov` n'a pas été écrit avant la coupure d'alimentation.",
      keyMechanisms: [
        {
          title: "Mode Autonome (Blind Container Synthesis)",
          desc: "Scanne les unités binaires du flux brut (SPS/PPS pour H.264/H.265, en-tête de trame `icpf` pour ProRes) pour identifier le framerate, la résolution, le profil couleur, puis génère un atome `moov` complet conforme aux normes internationales.",
        },
        {
          title: "Mode Référence (Fichier Sain de la Même Caméra)",
          desc: "L'utilisateur glisse un fichier sain enregistré avec la même caméra. Le moteur duplique la structure des pistes (`trak`) et greffe les tables de description (`stsd` : `avcC`, `hvcC`, `apch`, profil colorimétrique `colr`), puis recalcule les tables de synchronisation (`stsz`, `co64`).",
        },
        {
          title: "Assainissement de Bitstream (NAL Sanitizer)",
          desc: "Si des octets défectueux sont présents au milieu d'une trame, ils sont purgés ou complétés par une trame de maintien propre afin d'éviter tout plantage dans DaVinci Resolve ou Final Cut Pro.",
        },
      ],
      diagram: `+-------------------------------------------------------------+
|             SYNTHÈSE CHIRURGICALE D'ATOME MOOV (SANS PERTE) |
+-------------------------------------------------------------+
 [Fichier Corrompu : ftyp ? | mdat (10 Go de vidéo brute intacte) | moov MANQUANT !]
                                   |
                Extraction des trames & codecs (SPS/PPS/NAL)
                                   v
             [Génération Mathématique de l'Atome moov]
                 ├── trak (Vidéo : stsd avcC/hvcC, stsz, co64)
                 └── trak (Audio : stsd PCM/AAC, stts)
                                   v
 [Fichier Réparé : ftyp | moov (Index) | mdat] ===> 100% Lisible sans ré-encodage`,
      benefits: [
        "Conservation stricte de la qualité vidéo d'origine (Bit-Perfect, aucun ré-encodage).",
        "Compatible ProRes, H.264, H.265 (10-bit 4:2:2), Blackmagic RAW, REDCODE RAW.",
        "Fonctionne en quelques secondes même sur des rushs de plusieurs dizaines de gigaoctets.",
      ],
    },
  },

  tool5: {
    id: "tool5",
    number: "Outil 5",
    title: "Docteur Photo RAW & JPEG",
    badge: "Réparation IFD & Sauvetage Pleine Définition",
    accentColor: "text-[#A78BFA]",
    bgLightColor: "bg-[#8B5CF6]/15 text-[#C4B5FD] border-[#8B5CF6]/30",
    simpleExplanation:
      "Répare les photos RAW (.ARW, .CR3, .NEF, .DNG) ou JPEG qui affichent des lignes décalées, des couleurs bizarres ou un message d'erreur d'ouverture. En cas de dégâts graves, il sait également extraire l'aperçu pleine résolution intégré dans le fichier.",
    technicalDetails: {
      overview:
        "Réparation structurelle de la hiérarchie TIFF/IFD des fichiers RAW de capteurs photo et reconstruction des marqueurs de trames JPEG.",
      keyMechanisms: [
        {
          title: "Reconstruction d'Annuaires IFD (Image File Directories)",
          desc: "Répare les pointeurs détruits `IFD0`, `SubIFD` et `ExifIFD` qui indiquent où se trouvent la matrice de Bayer et les métadonnées de l'appareil photo.",
        },
        {
          title: "Chirurgie de Marqueurs JPEG & Tables Huffman",
          desc: "Si une photo JPEG est tronquée ou a perdu son en-tête, greffe des tables de quantification (`DQT`) et de Huffman (`DHT`) compatibles, et resynchronise les marqueurs de redémarrage `RST0` à `RST7`.",
        },
        {
          title: "Extraction d'Aperçu Haute Résolution (Zero-Loss Preview Salvage)",
          desc: "Si la matrice RAW est trop endommagée pour être dé-matricée, extrait l'image JPEG pleine résolution embarquée par le processeur d'image de l'appareil.",
        },
      ],
      diagram: `+-------------------------------------------------------------+
|             RECONSTRUCTION STRUCTURELLE PHOTO RAW / JPEG    |
+-------------------------------------------------------------+
 [Fichier RAW Corrompu] ──> [Vérification IFD / Header TIFF]
                                  │
          ┌───────────────────────┴───────────────────────┐
          v                                               v
 [IFD Réparable]                                 [Matrice Capteur HS]
        │                                                 │
        v                                                 v
 [Réalignement Pointeurs & DNG]                 [Extraction Aperçu Pleine Def]
        │                                                 │
        └─────────────────> [Photo Sauvée] <──────────────┘`,
      benefits: [
        "Restaure les photos de mariage, de shooting ou de reportage jugées perdues.",
        "Supporte tous les constructeurs majeurs (Sony ARW, Canon CR2/CR3, Nikon NEF, Fuji RAF).",
      ],
    },
  },

  tool6: {
    id: "tool6",
    number: "Outil 6",
    title: "Réparateur Audio Broadcast (WAV / BWF / RF64)",
    badge: "Reconstruction RIFF & Inférence de Variance",
    accentColor: "text-[#38BDF8]",
    bgLightColor: "bg-[#0284C7]/15 text-[#38BDF8] border-[#0284C7]/30",
    simpleExplanation:
      "Répare les pistes audio professionnelles (.WAV, .BWF) coupées brutalement lors d'une prise de son sur un enregistreur de tournage (Sound Devices, Zoom, Tascam). Il recalcule la durée exacte et réaligne le son pour qu'il s'ouvre proprement dans Pro Tools ou votre logiciel de montage.",
    technicalDetails: {
      overview:
        "Reconstruction déterministe d'en-têtes de conteneurs RIFF/WAV et analyse statistique d'autocorrélation pour les flux PCM bruts orphelins.",
      keyMechanisms: [
        {
          title: "Correction de Longueur de Chunk data",
          desc: "Lors d'une extinction brutale, la taille du sous-chunk `data` reste souvent à 0 ou 0xFFFFFFFF, empêchant la lecture. Le moteur mesure la masse binaire restante et recalcule la taille exacte.",
        },
        {
          title: "Inférence Statistique de Format PCM Brut",
          desc: "Même si les premiers kilo-octets du fichier ont été effacés, le moteur détermine la profondeur de bits (16, 24 ou 32 bits virgule flottante), la fréquence d'échantillonnage et le nombre de pistes (mono, stéréo, polyphonique 4 à 32 pistes) en analysant la variance inter-échantillons.",
        },
      ],
      diagram: `+-------------------------------------------------------------+
|            RECONSTRUCTION D'EN-TÊTE AUDIO RIFF / BWF        |
+-------------------------------------------------------------+
 [Fichier WAV Tronqué] : RIFF Header (data size = 0x00000000)
                                 │
           Calcul de la masse brute restante & format PCM
                                 v
 [En-tête RIFF / BWF Reconstruit avec métadonnées bext & iXML préservées]`,
      benefits: [
        "Sauve les prises de son de tournage sans artefacts ni distorsion.",
        "Compatible avec les enregistrements Broadcast Wave (BWF) multicanaux.",
      ],
    },
  },

  tool7: {
    id: "tool7",
    number: "Outil 7",
    title: "Latence Cellulaire NAND & Test Anti-Contrefaçon",
    badge: "Sonde LBA Modulo 2ᵏ & Détection Bit-Rot",
    accentColor: "text-[#60A5FA]",
    bgLightColor: "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30",
    simpleExplanation:
      "Cet outil mesure la santé de votre carte mémoire ou SSD et vérifie qu'il ne s'agit pas d'une arnaque. Il mesure le temps de réaction de la mémoire flash pour détecter l'usure invisible (bit-rot) avant qu'une panne ne survienne, et vérifie que la capacité indiquée sur l'emballage est bien réelle.",
    technicalDetails: {
      overview:
        "Sondage de surface non destructif en 240 points LBA réguliers via des lectures directes POSIX `pread()` non mises en cache (`F_NOCACHE`). Mesure la latence microseconde (µs) et démasque les cartes contrefaites.",
      keyMechanisms: [
        {
          title: "Classification de Santé par Latence Flash",
          desc: "• Vert (< 1 ms) : Cellules neuves et saines.\n• Bleu (1 à 5 ms) : État normal.\n• Jaune (5 à 50 ms) : Fatigue cellulaire. Le contrôleur s'y reprend à plusieurs fois avec le code correcteur LDPC (signe avant-coureur de mort imminente).\n• Rouge (> 50 ms ou Timeout) : Cellule morte ou secteur défectueux.",
        },
        {
          title: "Test Anti-Contrefaçon par Sonde Modulo 2ᵏ",
          desc: "Les fausses cartes SD (ex. vendues pour 1 To mais n'ayant que 32 Go) modifient le firmware pour boucler les écritures au-delà de leur capacité réelle. HardRecover sonde les adresses hautes et vérifie l'absence de rebouclage cyclique.",
        },
        {
          title: "Micro-Scan Chirurgical Automatique",
          desc: "Si une sonde détecte de la fatigue ou un secteur lent, le moteur lance automatiquement un zoom secteur par secteur sur la tranche de 16 Mo concernée pour localiser la panne au secteur près.",
        },
      ],
      diagram: `+-------------------------------------------------------------+
|         TEST DE LATENCE MICROSECONDE & ANTI-CONTREFAÇON     |
+-------------------------------------------------------------+
 Répartition de 240 Sondes LBA sur toute la capacité du support :
 [Sonde 1] ---- [Sonde 2] ---- [Sonde 3] ... ---- [Sonde 240]
     │              │              │                    │
  < 1 ms         1-5 ms        5-50 ms                > 50 ms
 [🟢 Sain]     [🔵 Normal]    [🟡 Fatigue]         [🔴 Critique]
                                   │                    │
                  Déclenche : [Outil 9: Refresh]   [Outil 8: Quarantaine]`,
      benefits: [
        "Détecte la dégradation d'une carte mémoire des mois avant la perte de données.",
        "Prouve immédiatement l'authenticité ou la contrefaçon d'une carte neuve.",
        "Totalement non destructif : s'exécute en quelques secondes.",
      ],
    },
  },

  tool8: {
    id: "tool8",
    number: "Outil 8",
    title: "Quarantaine des Cellules Mortes & Réhabilitation",
    badge: "Bad Block Exclusion & Remap d'Allocation",
    accentColor: "text-[#F59E0B]",
    bgLightColor: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
    simpleExplanation:
      "Si votre carte SD ou disque a des secteurs défectueux isolés (blocs rouges) qui provoquent des erreurs d'écriture ou font planter votre caméra, cet outil les condamne et les neutralise définitivement. Votre carte reste en 1 SEULE partition propre compatible avec votre caméra (aucune découpe en deux morceaux). Si le support a trop de blocs morts (réserve matérielle épuisée), HardRecover vous conseille de cloner d'urgence en image .img et de remplacer le support.",
    technicalDetails: {
      overview:
        "Isolation physique et logique des blocs NAND défectueux pour réhabiliter un support sans altérer son schéma de partitionnement unique (compatible caméras Sony, Canon, RED, Blackmagic).",
      keyMechanisms: [
        {
          title: "Garantie Partition Unique (Zéro Découpe)",
          desc: "Contrairement aux outils de partitionnement classiques qui scindent la carte en deux partitions inutilisables pour les caméras, HardRecover conserve 1 seule partition continue en neutralisant les blocs dans la table d'allocation et au niveau de l'Erase Block matériel.",
        },
        {
          title: "Verrouillage d'Allocation (Bitmap ExFAT / FAT32)",
          desc: "Le moteur identifie les clusters précis contenant les secteurs défectueux et les marque comme réservés/défectueux. Ni l'appareil photo ni l'ordinateur ne tenteront plus jamais d'y écrire.",
        },
        {
          title: "Exclusion d'Erase Block Complet (4 à 16 Mo)",
          desc: "Dans la mémoire flash NAND, un bloc ne s'efface pas secteur par secteur, mais par blocs physiques de 4 Mo à 16 Mo (Erase Blocks). HardRecover isole la totalité du bloc pour empêcher la contamination des cellules adjacentes.",
        },
        {
          title: "Seuil de Sécurité & Défaillance Critique",
          desc: "Si plus de 5 blocs physiques sont morts, la réserve interne (Spare Blocks) du contrôleur est saturée. L'outil bloque toute tentative de réparation illusoire et vous oriente vers le clonage d'urgence (.img).",
        },
      ],
      diagram: `+-------------------------------------------------------------+
|              NEUTRALISATION SUR PARTITION UNIQUE             |
+-------------------------------------------------------------+
 Carte SD / Disque (1 Seule Partition Continue) :
 [Bloc Sain 1]  [Zone HS Neutralisée (0xFFFFFFF7)]  [Bloc Sain 2]
                          ▲
       La caméra saute la zone morte sans bloquer.
  Votre carte reste intacte en 1 seul volume compatible !`,
      benefits: [
        "Conserve 1 SEULE partition continue : compatible 100% avec les caméras, drones et enregistreurs.",
        "Évite de jeter une carte SD ou un disque qui ne possède que quelques blocs isolés défaillants.",
        "Détecte la saturation de réserve pour vous avertir avant la perte irrémédiable de données.",
      ],
    },
  },

  tool9: {
    id: "tool9",
    number: "Outil 9",
    title: "Régénération Cellulaire NAND (Charge Refresh)",
    badge: "Zéro Risque Matériel • Zéro Perte de Données",
    accentColor: "text-[#FBBF24]",
    bgLightColor: "bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30",
    simpleExplanation:
      "La mémoire flash stocke vos données sous la forme de microscopiques charges électriques. Avec le temps et la chaleur, ces charges faiblissent, ce qui ralentit considérablement la lecture (cellules jaunes). Cet outil lit les données en mémoire, élimine les tensions parasites et réinjecte des électrons frais à pleine puissance. Votre carte redevient instantanément aussi rapide qu'au premier jour, sans risque pour vos fichiers.",
    technicalDetails: {
      overview:
        "Protocole de ré-étalonnage électrique non destructif ('Read-Verify-Refresh') restaurant la tension de grille flottante des cellules flash fatiguées.",
      keyMechanisms: [
        {
          title: "Cycle Atomique 'Read-Verify-Refresh'",
          desc: "1. Lecture atomique du bloc LBA fatigué dans la mémoire vive tampon (RAM).\n2. Vérification rigoureuse de l'intégrité via checksum CRC32.\n3. Réécriture immédiate avec forçage de synchronisation matérielle (`F_FULLFSYNC` / `fsync`).\n4. Le contrôleur flash réinjecte des électrons à tension nominale maximale, ce qui remet à zéro les compteurs d'erreurs LDPC du matériel.",
        },
        {
          title: "Restauration Immédiate de la Latence (< 1 ms)",
          desc: "Les cellules fatiguées qui mettaient entre 5 et 50 ms à répondre retombent instantanément sous la barre des 1000 µs (Vert).",
        },
        {
          title: "Zéro Risque Matériel & Zéro Perte",
          desc: "L'opération s'effectue bloc par bloc en mémoire tampon. Même en cas de coupure de courant accidentelle, aucune donnée n'est perdue.",
        },
      ],
      diagram: `+-------------------------------------------------------------+
|        CYCLE DE RÉGÉNÉRATION CELLULAIRE (CHARGE REFRESH)    |
+-------------------------------------------------------------+
  État Fatigué (Jaune 5-50 ms) :
  Grille Flottante Flash : [Charge Déchargée / Fuite Électrique]
             │
             ├──> 1. Lecture atomique en mémoire tampon RAM
             ├──> 2. Contrôle de cohérence CRC32
             └──> 3. Réécriture forcée à tension nominale maximale
             │
  État Régénéré (Vert < 1 ms) :
  Grille Flottante Flash : [Électrons Frais à Pleine Tension] ===> Latence < 1 ms`,
      benefits: [
        "Ressuscite les cellules lentes avant qu'elles ne deviennent des secteurs morts.",
        "Supprime les saccades et baisses de débit en enregistrement vidéo 4K/8K.",
        "Restaure les performances d'origine sans devoir formater la carte.",
      ],
    },
  },
};

