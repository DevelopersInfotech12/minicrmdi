import ActivityLog from "../models/ActivityLog.js";

/**
 * Log an activity event.
 *
 * @param {Object} opts
 * @param {ObjectId}  opts.owner       - User ID
 * @param {string}    opts.entityType  - "project"|"client"|"payment"|...
 * @param {ObjectId}  opts.entityId    - ID of the entity
 * @param {string}    [opts.entityName]- Human name snapshot
 * @param {ObjectId}  [opts.project]   - Related project ID
 * @param {ObjectId}  [opts.client]    - Related client ID
 * @param {string}    opts.action      - "created"|"updated"|"deleted"|...
 * @param {string}    opts.description - Human-readable sentence
 * @param {Array}     [opts.changes]   - [{field, from, to}]
 * @param {string}    opts.page        - "project"|"client"|"payment"|"calendar"|"recurring"
 * @param {string}    [opts.icon]      - lucide icon name
 * @param {string}    [opts.color]     - hex color
 */
export const logActivity = async (opts) => {
  try {
    await ActivityLog.create({
      owner:       opts.owner,
      entityType:  opts.entityType,
      entityId:    opts.entityId,
      entityName:  opts.entityName  || null,
      project:     opts.project     || null,
      client:      opts.client      || null,
      action:      opts.action,
      description: opts.description || "",
      changes:     opts.changes     || [],
      page:        opts.page,
      icon:        opts.icon        || "activity",
      color:       opts.color       || "#6366f1",
    });
  } catch (err) {
    // Never let logging break the main request
    console.error("[ActivityLog] Failed to log activity:", err.message);
  }
};

/**
 * Diff two plain objects and return [{field, from, to}] for changed fields.
 * Pass a whitelist of fields to track.
 */
export const diffObjects = (oldObj, newObj, fields) => {
  const changes = [];
  for (const field of fields) {
    const oldVal = oldObj?.[field];
    const newVal = newObj?.[field];
    const oldStr = oldVal === null || oldVal === undefined ? "" : String(oldVal);
    const newStr = newVal === null || newVal === undefined ? "" : String(newVal);
    if (oldStr !== newStr) {
      changes.push({ field, from: oldVal ?? null, to: newVal ?? null });
    }
  }
  return changes;
};
