CREATE INDEX "request_status_history_request_id_idx" ON "request_status_history" USING btree ("requestId");--> statement-breakpoint
CREATE INDEX "request_status_history_changed_by_idx" ON "request_status_history" USING btree ("changedBy");--> statement-breakpoint
CREATE INDEX "requests_created_by_idx" ON "requests" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "requests_reviewed_by_idx" ON "requests" USING btree ("reviewedBy");