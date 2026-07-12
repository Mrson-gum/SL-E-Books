import { Book } from './types';

export const PRESET_GRADIENTS = [
  {
    name: "Classic Emerald",
    bg: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
    text: "text-emerald-100",
    accent: "text-amber-300",
    border: "border-emerald-700",
  },
  {
    name: "Royal Velvet",
    bg: "linear-gradient(135deg, #311042 0%, #12031a 100%)",
    text: "text-purple-100",
    accent: "text-pink-300",
    border: "border-purple-900",
  },
  {
    name: "Sunset Prose",
    bg: "linear-gradient(135deg, #7c2d12 0%, #4c1d95 100%)",
    text: "text-orange-100",
    accent: "text-yellow-200",
    border: "border-orange-800",
  },
  {
    name: "Oceanic Tale",
    bg: "linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)",
    text: "text-sky-100",
    accent: "text-emerald-200",
    border: "border-sky-800",
  },
  {
    name: "Crimson Mystery",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    text: "text-red-100",
    accent: "text-amber-400",
    border: "border-red-800",
  },
  {
    name: "Deep Obsidian",
    bg: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    text: "text-slate-100",
    accent: "text-cyan-300",
    border: "border-slate-800",
  },
];

export const DEFAULT_BOOKS: Book[] = [
  {
    id: "def-1",
    title: "Die Verwandlung",
    author: "Franz Kafka",
    description: "Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheuren Ungeziefer verwandelt.",
    genre: "Klassiker",
    coverType: "gradient",
    coverGradientIndex: 0,
    createdAt: "2026-05-26T12:00:00Z",
    chapters: [
      {
        id: "c1",
        title: "Kapitel I: Das Erwachen",
        content: `Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheuren Ungeziefer verwandelt. Er lag auf seinem panzerartig harten Rücken und sah, wenn er den Kopf ein wenig hob, seinen gewölbten, braunen, von bogenförmigen Versteifungen geteilten Bauch, auf dessen Höhe sich die Bettdecke, im Begriff, vollständig herabzugleiten, kaum noch erhalten konnte. Seine vielen, im Vergleich zu seinem sonstigen Umfang kläglich dünnen Beine flimmerten ihm hilflos vor den Augen.

»Was ist mit mir geschehen?« dachte er. Es war kein Traum. Sein Zimmer, ein richtiges, nur etwas zu kleines Menschenzimmer, lag ruhig zwischen den vier bekannten Wänden. Über dem Tisch, auf dem eine auseinandergepackte Musterkollektion von Tuchwaren ausgebreitet war – Samsa war Reisender –, hing das Bild, das er vor kurzem aus einer illustrierten Zeitschrift ausgeschnitten und in einem hübschen, vergoldeten Rahmen untergebracht hatte. Es stellte eine Dame dar, die, mit einem Pelzhut und einer Pelzboah versehen, aufrecht dasaß und einen schweren Pelzmuff, in dem ihr ganzer Unterarm verschwunden war, dem Beschauer entgegenhob.

Gregors Blick richtete sich dann zum Fenster, und das trübe Wetter – man hörte Regentropfen auf das Fensterblech aufschlagen – machte ihn ganz melancholisch. »Wie wäre es, wenn ich noch ein wenig schliefe und alle Narrheiten vergäße«, dachte er, aber das war gänzlich undurchführbar, denn er war gewöhnt, auf der rechten Seite zu schlafen, konnte sich aber in seinem gegenwärtigen Zustand nicht in diese Lage bringen. Mit welchem Aufwand er sich auch auf die rechte Seite warf, immer wieder wiegte er sich in die Rücklage zurück.`
      },
      {
        id: "c2",
        title: "Kapitel II: Die Familie",
        content: `Erst am späten Abend erwachte Gregor aus seinem schweren, ohnmachtsähnlichen Schlaf. Er wäre wahrscheinlich auch ohne Störung nicht viel später aufgewacht, denn er fühlte sich hinreichend ausgeruht und ausgeschlafen, doch schien es ihm, als hätte ihn ein flüchtiger Schritt und das vorsichtige Schließen der Korridortür geweckt. Der Lichtschein der elektrischen Straßenlaternen lag hie und da bleich auf der Zimmerdecke und auf den höheren Teilen der Möbel, aber unten bei Gregor war es dunkel. Siechenderweise schob er sich, noch tollpatschig mit seinen Fühlern tastend, der Tür zu, um zu sehen, was dort vorgegangen war.

Seine linke Seite schien eine einzige lange, unangenehm spannende Narbe zu sein, und er musste auf seinen zwei Reihen von Beinchen ganz ungleichmäßig hinken. Ein Beinchen war übrigens im Laufe der Vormittagsereignisse schwer verletzt worden – es war fast ein Wunder, dass nur eines verletzt war – und schleifte leblos hinterher.

Erst an der Tür merkte er, was ihn eigentlich dorthin gelockt hatte; es war der Geruch von etwas Essbarem gewesen. Denn dort stand ein Napf, gefüllt mit süßer Milch, in der kleine Schnitten Weißbrot schwammen. Er hätte fast vor Freude gelacht, denn er hatte noch größeren Hunger als am Morgen, und er tauchte sofort seinen Kopf fast bis über die Augen in die Milch hinein.`
      },
      {
        id: "c3",
        title: "Kapitel III: Das Ende",
        content: `Die schwere Verletzung Gregors, an der er über einen Monat litt – der Apfel blieb als sichtbares Andenken im Fleische stecken, da ihn niemand zu entfernen wagte –, schien selbst den Vater daran erinnert zu haben, dass Gregor trotz seiner traurigen und ekelhaften jetzigen Gestalt ein Familienmitglied war, das man nicht wie einen Feind behandeln durfte, sondern dem gegenüber es das Gebot der Familienpflicht war, den Widerwillen hinunterzuschlucken und zu dulden, nur zu dulden.

Und wenn Gregor auch durch seine Wunde an Beweglichkeit wahrscheinlich für immer verloren hatte und vorläufig zur Durchquerung seines Zimmers wie ein alter Invalide lange, lange Minuten brauchte – an ein Aufkriechen an die Decke war nicht zu denken –, so bekam er für diese Verschlimmerung seines Zustandes einen seiner Meinung nach vollständig ausreichenden Ersatz: es wurde nämlich allabendlich die Zimmertür geöffnet, die er schon zwei Stunden vor dem Abendessen scharf zu beobachten pflegte.`
      }
    ]
  },
  {
    id: "def-2",
    title: "Alice im Wunderland",
    author: "Lewis Carroll",
    description: "Folge Alice durch den Kaninchenbau in eine skurrile, traumhafte Welt voller sprechender Tiere und exzentrischer Spielkarten.",
    genre: "Fantasy",
    coverType: "gradient",
    coverGradientIndex: 1,
    createdAt: "2026-05-26T12:10:00Z",
    chapters: [
      {
        id: "alice-1",
        title: "Kapitel I: Hinunter in den Kaninchenbau",
        content: `Alice fing an sich zu langweilen; sie saß schon lange bei ihrer Schwester am Ufer und hatte nichts zu tun. Ein- oder zweimal hatte sie in das Buch hineingesehen, das ihre Schwester las, aber es waren keine Bilder oder Gespräche darin. »Und was nützt ein Buch«, dachte Alice, »ohne Bilder und Gespräche?«

Sie überlegte sich eben, ob das Vergnügen, eine Gänseblümchenkette zu flechten, die Mühe wert sei, aufzustehen und die Gänseblümchen zu pflücken, als plötzlich ein weißes Kaninchen mit roten Augen dicht an ihr vorbeirannte.

Da war nun eigentlich nichts Besonderes dabei; Alice fand es nicht einmal sehr merkwürdig, als sie das Kaninchen vor sich hin sprechen hörte: »O weh, o weh! Ich werde zu spät kommen!« Als aber das Kaninchen eine echte Taschenuhr aus seiner Westentasche zog, auf sie blickte und dann eilig weiterlief, sprang Alice auf ihre Füße. Es ging ihr auf einmal durch den Kopf, dass sie noch nie ein Kaninchen mit einer Westentasche oder einer Uhr darin gesehen hatte. Vor Neugier brennend, rannte sie ihm hinterher über das Feld und sah es gerade noch in ein großes Kaninchenloch unter der Hecke schlüpfen.`
      },
      {
        id: "alice-2",
        title: "Kapitel II: Der Tränenpool",
        content: `»Sonderbarer und sonderbarer!« rief Alice (sie war so überrascht, dass sie im Moment ganz vergaß, wie man richtig Deutsch spricht). »Jetzt öffne ich mich wie das größte Teleskop der Welt! Lebt wohl, meine Füße!« (denn als sie auf ihre Füße hinabsah, waren sie fast außer Sichtweite, so weit weg waren sie schon).

»Oh, meine armen kleinen Füße! Wer wird euch jetzt die Schuhe und Strümpfe anziehen? Ich bin ganz bestimmt viel zu weit weg, um mich darum zu kümmern. Ihr müsst euer Bestes tun.«

Gerade in diesem Moment stieß ihr Kopf an die Decke der Halle: sie war jetzt über zwei Meter siebzig groß! Sie nahm augenblicklich den kleinen goldenen Schlüssel und eilte an die Gartentür. Doch die arme Alice! Sie konnte nichts weiter tun, als sich auf die Seite legen und mit einem Auge in den Garten schauen; aber hindurchzugehen war unmöglicher als je zuvor. Sie setzte sich wieder hin und fing an zu weinen.`
      }
    ]
  },
  {
    id: "def-3",
    title: "Die Zeitmaschine",
    author: "H. G. Wells",
    description: "Eine Reise in die ferne Zukunft unserer Erde, wo sich die Menschheit in zwei gegensätzliche Spezies aufgeteilt hat: die Eloi und die Morlocks.",
    genre: "Science Fiction",
    coverType: "image",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=400",
    coverGradientIndex: 2,
    createdAt: "2026-05-26T12:20:00Z",
    chapters: [
      {
        id: "tm-1",
        title: "Kapitel I: Die vierte Dimension",
        content: `Der Zeitreisende (denn so ist es am bequemsten, ihn zu nennen) legte uns eine geheimnisvolle Theorie dar. Seine grauen Augen leuchteten und funkelten, und sein gewöhnlich blasses Gesicht war gerötet und belebt. Das Feuer brannte hell, und das weiche Licht der Glühlampen in den silbernen Lilien suchte sich in unseren Gläsern widerzuspiegeln.

»Folgen Sie mir aufmerksam«, sagte er. »Ich werde eine oder zwei Behauptungen aufstellen müssen, die das angreifen, was man allgemeine Physik nennt. Sie wissen natürlich, dass eine mathematische Linie, eine Linie ohne Dicke, keine tatsächliche Existenz hat. Das hat man Ihnen beigebracht. Ebenso wenig hat eine mathematische Fläche eine reale Existenz. Das sind bloße Abstraktionen.«

»Das ist richtig«, sagte der Psychologe.

»Ebenso wenig hat ein Würfel, der nur Länge, Breite und Höhe besitzt, eine reale Existenz.«

»Da protestiere ich«, sagte Filby, ein rothaariger Mann mit schnellen Argumenten. »Ein Würfel existiert ganz gewiss. Alle realen Dinge existieren.«

»Wirklich? Kann ein Würfel existieren, der überhaupt keine Zeitdauer hat?«`
      }
    ]
  }
];

export const GENRES = [
  "Alle",
  "Klassiker",
  "Fantasy",
  "Science Fiction",
  "Drama",
  "Abenteuer",
  "Krimi",
  "Andere"
];
