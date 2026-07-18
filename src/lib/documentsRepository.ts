import type { WorkspaceDocument } from "../data/documentsData";

const DATABASE_NAME = "clm-asso-workspace";
const DATABASE_VERSION = 1;
const DOCUMENT_STORE = "documents";

function openDocumentsDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (
        !database.objectStoreNames.contains(
          DOCUMENT_STORE,
        )
      ) {
        database.createObjectStore(DOCUMENT_STORE, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error(
            "Impossible d’ouvrir la base Documents.",
          ),
      );
    };
  });
}

export async function listWorkspaceDocuments(): Promise<
  WorkspaceDocument[]
> {
  const database = await openDocumentsDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DOCUMENT_STORE,
      "readonly",
    );

    const store =
      transaction.objectStore(DOCUMENT_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(
        (request.result as WorkspaceDocument[]).sort(
          (firstDocument, secondDocument) =>
            secondDocument.updatedAt.localeCompare(
              firstDocument.updatedAt,
            ),
        ),
      );
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      database.close();
    };
  });
}

export async function getWorkspaceDocument(
  documentId: string,
): Promise<WorkspaceDocument | undefined> {
  const database = await openDocumentsDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DOCUMENT_STORE,
      "readonly",
    );

    const store =
      transaction.objectStore(DOCUMENT_STORE);

    const request = store.get(documentId);

    request.onsuccess = () => {
      resolve(
        request.result as
          | WorkspaceDocument
          | undefined,
      );
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      database.close();
    };
  });
}

export async function saveWorkspaceDocument(
  document: WorkspaceDocument,
): Promise<void> {
  const database = await openDocumentsDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DOCUMENT_STORE,
      "readwrite",
    );

    const store =
      transaction.objectStore(DOCUMENT_STORE);

    store.put(document);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function removeWorkspaceDocument(
  documentId: string,
): Promise<void> {
  const database = await openDocumentsDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DOCUMENT_STORE,
      "readwrite",
    );

    const store =
      transaction.objectStore(DOCUMENT_STORE);

    store.delete(documentId);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function initialiseWorkspaceDocuments(
  seedDocuments: WorkspaceDocument[],
): Promise<void> {
  const existingDocuments =
    await listWorkspaceDocuments();

  if (existingDocuments.length > 0) {
    return;
  }

  await Promise.all(
    seedDocuments.map((document) =>
      saveWorkspaceDocument(document),
    ),
  );
}