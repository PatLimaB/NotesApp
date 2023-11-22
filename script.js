let buttonElement = document.getElementById("addNoteButton");
buttonElement.addEventListener("click", addNote);

let deleteAllButton = document.getElementById("deleteAllButton");
deleteAllButton.addEventListener("click", deleteAllNotes);

const INDEXDB_NAME = "notesDB";
const INDEXDB_VERSION = 1;
const STORE_NAME = "notesStore";

let db = null;

//Función que abre la base de datos que vamos a utilizar para esta aplicación
function openDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open(INDEXDB_NAME, INDEXDB_VERSION);

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                let objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

function addNote() {
    openDB()
        .then(() => {
            //Añadimos una nueva nota vacía
            addData({ "text": "" })
                .then((noteId) => {
                    console.log('Nota añadida correctamente a la base de datos.');
                    displayNotes(noteId, "");
                    // Mostrar el botón después de agregar la primera nota
                    showDeleteAllButton();
                })
                .catch((error) => {
                    console.error("Error addData:" + error);
                });
        })
        .catch((error) => {
            console.error("Error openDB:" + error);
        });
}

//Añadimos datos a la base de datos con esta función
function addData(data) {
    if (!db) {
        throw new Error("La base de datos no está abierta.");
    }

    return new Promise((resolve, reject) => {
        let transaction = db.transaction([STORE_NAME], "readwrite");
        let objectStore = transaction.objectStore(STORE_NAME);
        let request = objectStore.add(data);

        request.onsuccess = (event) => {
            resolve(event.target.result); //Pasamos el ID de la nota al resolver la promesa
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

//Eliminamos de la base de datos la nota seleccionada
function deleteNoteFromDB(noteId) {
    if (!db) {
        throw new Error("La base de datos no está abierta.");
    }

    return new Promise((resolve, reject) => {
        let transaction = db.transaction([STORE_NAME], "readwrite");
        let objectStore = transaction.objectStore(STORE_NAME);
        let request = objectStore.delete(noteId);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

//Función para ver las notas en el navegador
function displayNotes(noteId, text) {
    //Obtenemos el contenedor de notas
    let notesContainer = document.getElementById('notesContainer');

    //Creamos un nuevo div para la nota
    let noteDiv = document.createElement('div');
    noteDiv.classList.add('note');

    //Creamos el textarea
    let textarea = document.createElement('textarea');
    //Asignamos el valor del textarea con el texto almacenado en indexedDB
    textarea.value = text;

    //Creamos el botón de eliminar
    let deleteButton = document.createElement('button');
    deleteButton.classList.toggle('deleteButton');
    deleteButton.textContent = 'Eliminar Nota';
    deleteButton.addEventListener('click', () => {
        //Obtenemos el ID de la nota del atributo personalizado
        let noteIdToDelete = noteDiv.getAttribute('data-note-id');
        //Eliminamos la nota de indexedDB y del DOM
        deleteNoteFromDB(noteIdToDelete)
            .then(() => {
                notesContainer.removeChild(noteDiv);
            })
            .catch((error) => {
                console.error("Error deleteNoteFromDB:" + error);
            });
    });

    //Creamos el botón de guardar
    let saveButton = document.createElement('button');
    saveButton.textContent = 'Guardar Nota';
    saveButton.classList.toggle('saveButton');
    saveButton.addEventListener('click', () => {
        let noteIdToSave = noteDiv.getAttribute('data-note-id');
        let newText = textarea.value;  // Capturamos el nuevo texto del textarea
        updateNoteInDB(noteIdToSave, newText);
    });

    //Agregamos el textarea y los botones al div de la nota
    noteDiv.appendChild(textarea);
    noteDiv.appendChild(deleteButton);
    noteDiv.appendChild(saveButton);

    //Asignamos el ID de la nota al atributo personalizado
    noteDiv.setAttribute('data-note-id', noteId);

    //Agregamos el div de la nota al contenedor de notas
    notesContainer.appendChild(noteDiv);
}

//Función para actualizar la nota dentro de la propia base de datos
function updateNoteInDB(noteId, newText) {
    if (!db) {
        throw new Error("La base de datos no está abierta.");
    }

    return new Promise((resolve, reject) => {
        let transaction = db.transaction([STORE_NAME], "readwrite");
        let objectStore = transaction.objectStore(STORE_NAME);
        let getRequest = objectStore.get(noteId);

        getRequest.onsuccess = (event) => {
            let note = event.target.result;

            if (note) {
                //Actualizamos el contenido de la nota con el nuevo texto del textarea
                note.text = newText;

                //Guardamos la nota actualizada en la base de datos
                let updateRequest = objectStore.put(note, noteId);

                updateRequest.onsuccess = () => {
                    //Verificamos en la consola que se ha guardado correctamente
                    console.log("Nota actualizada:", { noteId, newText });
                    resolve();
                };

                updateRequest.onerror = (event) => {
                    reject(event.target.error);
                };
            } else {
                //Si no se encuentra la nota, se añadirá como una nueva
                addData({ "text": newText })
                    .then((newNoteId) => {
                        //Verificamos que se ha añadido la nueva nota
                        console.log("Nueva nota añadida:", { newNoteId, newText });
                        resolve(newNoteId);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            }
        };

        getRequest.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function deleteAllNotes() {
    //Abrimos la base de datos
    openDB()
        .then(() => {
            //Abrimos una transacción de lectura/escritura
            let transaction = db.transaction([STORE_NAME], "readwrite");
            let objectStore = transaction.objectStore(STORE_NAME);

            //Borramos todas las notas
            objectStore.clear();

            //Eliminamos todas las notas del contenedor en el DOM
            let notesContainer = document.getElementById('notesContainer');
            notesContainer.innerHTML = '';

            console.log('Todas las notas eliminadas.');
            //Ocultamos el botón de eliminar todas las notas después de eliminarlas
            hideDeleteAllButton();
        })
        .catch((error) => {
            console.error("Error deleteAllNotes:" + error);
        });
}

// Función para mostrar el botón de eliminar todas las notas
function showDeleteAllButton() {
    let deleteAllButton = document.getElementById("deleteAllButton");
    deleteAllButton.style.display = "inline-block";
}

// Función para ocultar el botón de eliminar todas las notas
function hideDeleteAllButton() {
    let deleteAllButton = document.getElementById("deleteAllButton");
    deleteAllButton.style.display = "none";
}