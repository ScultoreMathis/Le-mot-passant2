/* 1. Éléments et variables */
function element(id) { return document.getElementById(id); }
const nomsBox = element("noms-joueurs"), nombreJoueurs = element("nombre-joueurs");
const motDepart = element("mot-depart"), duree = element("duree"), activerJoker = element("activer-joker");
const formulaireMot = element("formulaire-mot"), motPropose = element("mot-propose");
const decision = element("decision"), alerteSimilaires = element("alerte-similaires"), resultat = element("resultat");
let joueurs = [], historique = [], indexJoueur = 0, motEnAttente = "", reglages = {}, timer = null;
let partieActive = false, ecranAvantRegles = "accueil";

/* 2. Écrans et champs des joueurs */
function afficherEcran(nom) {
    let ecrans = document.querySelectorAll(".ecran");
    for (let i = 0; i < ecrans.length; i++) ecrans[i].classList.add("cache");
    element(nom).classList.remove("cache");
}
function creerChamps() {
    nomsBox.innerHTML = "";
    for (let i = 0; i < Number(nombreJoueurs.value); i++) {
        let champ = document.createElement("input");
        champ.className = "nom";
        champ.placeholder = "Joueur " + (i + 1);
        champ.setAttribute("aria-label", "Nom du joueur " + (i + 1));
        champ.required = true;
        nomsBox.appendChild(champ);
    }
}

/* 3. Nettoyer les mots et rechercher les doublons */
function nettoyer(mot) { return mot.trim().toLowerCase(); }
function chercherMot(mot) {
    for (let i = 0; i < historique.length; i++) {
        if (nettoyer(historique[i].mot) === nettoyer(mot)) return true;
    }
    return false;
}
// Ressemblance simple : avertit le groupe sans décider à sa place.
function motsSeRessemblent(a, b) {
    if (a.length < 3 || b.length < 3) return false;
    if (a.indexOf(b) !== -1 || b.indexOf(a) !== -1) return true;
    let motsA = a.split(" "), motsB = b.split(" ");
    for (let i = 0; i < motsA.length; i++) {
        for (let j = 0; j < motsB.length; j++) {
            if (motsA[i].length >= 4 && motsB[j].length >= 4 && motsA[i].substring(0, 4) === motsB[j].substring(0, 4)) return true;
        }
    }
    return false;
}
function trouverMotsSimilaires(mot) {
    let trouves = [];
    for (let i = 0; i < historique.length; i++) {
        let ancien = nettoyer(historique[i].mot);
        if (ancien !== nettoyer(mot) && motsSeRessemblent(nettoyer(mot), ancien)) trouves.push(historique[i].mot);
    }
    return trouves;
}

/* 4. Historique des propositions */
function ajouterMot(joueur, mot, statut) {
    historique.push({ joueur: joueur, mot: mot, statut: statut });
    afficherHistorique();
}
function ajouterCellule(ligne, texte) {
    let cellule = document.createElement("td");
    cellule.textContent = texte;
    ligne.appendChild(cellule);
}
function afficherHistorique() {
    let tableau = element("table-historique");
    tableau.innerHTML = "";
    for (let i = historique.length - 1; i >= 0; i--) {
        let ligne = document.createElement("tr");
        ajouterCellule(ligne, historique[i].joueur);
        ajouterCellule(ligne, historique[i].mot);
        ajouterCellule(ligne, historique[i].statut);
        tableau.appendChild(ligne);
    }
    element("compteur-historique").textContent = historique.length + (historique.length > 1 ? " entrées" : " entrée");
}

/* 5. Afficher les joueurs et le tour */
function compterVivants() {
    let total = 0;
    for (let i = 0; i < joueurs.length; i++) if (!joueurs[i].elimine) total++;
    return total;
}
function afficherJoueurs() {
    let zone = element("joueurs");
    zone.innerHTML = "";
    for (let i = 0; i < joueurs.length; i++) {
        let joueur = joueurs[i], carte = document.createElement("div");
        let nom = document.createElement("strong"), statut = document.createElement("span");
        carte.className = "joueur";
        if (i === indexJoueur && !joueur.elimine) carte.classList.add("actuel");
        if (joueur.elimine) carte.classList.add("elimine");
        nom.textContent = joueur.nom;
        if (joueur.elimine) statut.textContent = "Éliminé";
        else if (!reglages.joker) statut.textContent = "En jeu";
        else if (joueur.joker) statut.textContent = "Chance disponible";
        else statut.textContent = "Chance utilisée";
        carte.appendChild(nom);
        carte.appendChild(statut);
        zone.appendChild(carte);
    }
    element("compteur-joueurs").textContent = compterVivants() + " en jeu";
}
function afficherTour() {
    element("joueur-actuel").textContent = joueurs[indexJoueur].nom;
    element("mot-reference").textContent = reglages.motDepart.toUpperCase();
    if (!reglages.joker) element("joker-statut").textContent = "Désactivée";
    else if (joueurs[indexJoueur].joker) element("joker-statut").textContent = "Disponible";
    else element("joker-statut").textContent = "Déjà utilisée";
    afficherJoueurs();
}

/* 6. Chronomètre et passage au joueur suivant */
function arreterTimer() { clearInterval(timer); timer = null; }
function lancerTimer() {
    arreterTimer();
    let secondes = reglages.duree;
    if (secondes === 0) { element("chrono").textContent = "Illimité"; return; }
    element("chrono").textContent = secondes + " s";
    timer = setInterval(function () {
        if (!partieActive) { arreterTimer(); return; }
        secondes--;
        element("chrono").textContent = secondes + " s";
        if (secondes <= 0) { arreterTimer(); traiterErreur("Le temps est fini."); }
    }, 1000);
}
function passerAuSuivant() {
    do {
        indexJoueur++;
        if (indexJoueur >= joueurs.length) indexJoueur = 0;
    } while (joueurs[indexJoueur].elimine);
    motPropose.value = "";
    decision.classList.add("cache");
    formulaireMot.classList.remove("cache");
    alerteSimilaires.classList.add("cache");
    resultat.textContent = "";
    afficherTour();
    lancerTimer();
}

/* 7. Erreurs, deuxième chance et victoire */
function traiterErreur(message) {
    arreterTimer();
    decision.classList.add("cache");
    formulaireMot.classList.remove("cache");
    let joueur = joueurs[indexJoueur];
    if (reglages.joker && joueur.joker) {
        joueur.joker = false;
        resultat.textContent = message + " Deuxième chance utilisée : tu peux réessayer.";
        motPropose.value = "";
        afficherTour();
        lancerTimer();
        return;
    }
    joueur.elimine = true;
    if (compterVivants() === 1) { terminerPartie(); return; }
    passerAuSuivant();
    resultat.textContent = message + " " + joueur.nom + " est éliminé.";
}
function terminerPartie() {
    arreterTimer();
    partieActive = false;
    for (let i = 0; i < joueurs.length; i++) {
        if (!joueurs[i].elimine) element("gagnant").textContent = joueurs[i].nom + " gagne la partie.";
    }
    afficherEcran("fin");
}

/* 8. Proposition et décision du groupe */
function proposerMot() {
    let mot = nettoyer(motPropose.value);
    if (mot === "") { resultat.textContent = "Écris un mot ou une expression."; return; }
    if (mot === nettoyer(reglages.motDepart)) { traiterErreur("Le mot de départ a déjà été dit."); return; }
    if (chercherMot(mot)) { traiterErreur("Ce mot a déjà été dit."); return; }
    let ressemblances = trouverMotsSimilaires(mot);
    motEnAttente = mot;
    ajouterMot(joueurs[indexJoueur].nom, mot, "En attente");
    arreterTimer();
    formulaireMot.classList.add("cache");
    decision.classList.remove("cache");
    element("mot-a-decider").textContent = mot;
    if (ressemblances.length > 0) {
        alerteSimilaires.textContent = "Ce mot ressemble à : " + ressemblances.join(", ") + ". Le groupe peut dire oui ou non.";
        alerteSimilaires.classList.remove("cache");
    } else {
        alerteSimilaires.textContent = "";
        alerteSimilaires.classList.add("cache");
    }
    resultat.textContent = "";
}
function terminerDecision(statut) {
    for (let i = 0; i < historique.length; i++) if (historique[i].mot === motEnAttente) historique[i].statut = statut;
    motEnAttente = "";
    afficherHistorique();
}
function accepterMot() { terminerDecision("Accepté"); passerAuSuivant(); }
function refuserMot() { terminerDecision("Refusé"); traiterErreur("Le groupe a refusé ce mot."); }

/* 9. Configuration et démarrage */
function verifierConfiguration() {
    let erreur = "", champs = nomsBox.querySelectorAll(".nom");
    if (motDepart.value.trim() === "") erreur = "Choisis un mot de départ.";
    for (let i = 0; i < champs.length; i++) if (champs[i].value.trim() === "") erreur = "Donne un nom à chaque joueur.";
    element("erreur-configuration").textContent = erreur;
    if (erreur === "") preparerPartie();
}
function preparerPartie() {
    arreterTimer();
    joueurs = []; historique = []; indexJoueur = 0; motEnAttente = ""; partieActive = true;
    reglages = { motDepart: motDepart.value.trim(), duree: Number(duree.value), joker: activerJoker.value === "oui" };
    let champs = nomsBox.querySelectorAll(".nom");
    for (let i = 0; i < champs.length; i++) joueurs.push({ nom: champs[i].value.trim(), elimine: false, joker: reglages.joker });
    element("zone-historique").open = false;
    ajouterMot("Jeu", nettoyer(reglages.motDepart), "Mot de départ");
    element("erreur-configuration").textContent = "";
    resultat.textContent = "";
    alerteSimilaires.classList.add("cache");
    decision.classList.add("cache");
    formulaireMot.classList.remove("cache");
    afficherEcran("jeu"); afficherTour(); lancerTimer();
}

/* 10. Boutons et formulaires */
function ouvrirRegles(retour) { ecranAvantRegles = retour; arreterTimer(); afficherEcran("regles"); }
element("commencer").addEventListener("click", function () { afficherEcran("configuration"); creerChamps(); });
element("ouvrir-regles").addEventListener("click", function () { ouvrirRegles("accueil"); });
element("regles-jeu").addEventListener("click", function () { ouvrirRegles("jeu"); });
element("fermer-regles").addEventListener("click", function () {
    afficherEcran(ecranAvantRegles);
    if (ecranAvantRegles === "jeu" && partieActive && decision.classList.contains("cache")) lancerTimer();
});
element("retour").addEventListener("click", function () { afficherEcran("accueil"); });
element("quitter").addEventListener("click", function () { arreterTimer(); partieActive = false; afficherEcran("accueil"); });
element("rejouer").addEventListener("click", preparerPartie);
element("nouvelle").addEventListener("click", function () { arreterTimer(); afficherEcran("configuration"); creerChamps(); });
nombreJoueurs.addEventListener("change", creerChamps);
element("formulaire-configuration").addEventListener("submit", function (event) { event.preventDefault(); verifierConfiguration(); });
formulaireMot.addEventListener("submit", function (event) { event.preventDefault(); proposerMot(); });
element("accepter").addEventListener("click", accepterMot);
element("refuser").addEventListener("click", refuserMot);
creerChamps();
