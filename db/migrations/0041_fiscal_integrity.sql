-- Integridad de los registros que la ley obliga a conservar (facturas y pagos
-- se guardan 10 años, Ley 962/2005). La aplicación solo hace borrado lógico,
-- pero un `DELETE FROM projects` manual (o desde un script) arrastraba en
-- cascada facturas, pagos y retainers. Con RESTRICT, Postgres lo impide.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_project_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;

ALTER TABLE retainers DROP CONSTRAINT IF EXISTS retainers_project_id_fkey;
ALTER TABLE retainers ADD CONSTRAINT retainers_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;
ALTER TABLE retainers DROP CONSTRAINT IF EXISTS retainers_client_id_fkey;
ALTER TABLE retainers ADD CONSTRAINT retainers_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_client_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;

-- Montos positivos. `NOT VALID`: se exige a las filas NUEVAS sin escanear (ni
-- fallar por) datos históricos que pudieran tener un 0; validarlas después con
-- `ALTER TABLE ... VALIDATE CONSTRAINT` cuando se revise la producción.
ALTER TABLE invoices ADD CONSTRAINT invoices_amount_positive CHECK (amount > 0) NOT VALID;
ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0) NOT VALID;
ALTER TABLE retainers ADD CONSTRAINT retainers_amount_positive CHECK (amount > 0) NOT VALID;
