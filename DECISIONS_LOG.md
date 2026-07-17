# DECISIONS_LOG

- Notebook uses the existing ApiResource, Providers and Processors.
- CSRF tokens are fetched immediately before writes and never persisted.
- The first mobile editor is a plain textarea; no rich-editor dependency is added.
- Notebook content is not cached offline because it is personal user data and secure native storage is not implemented yet.
