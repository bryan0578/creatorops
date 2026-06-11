export {
  AI_OUTPUT_MODULE_TYPES,
  type AIOutputModuleType,
  type FieldConflict,
  type ModuleFieldDefinition,
  type ParseAIOutputInput,
  type ParseAIOutputResult,
  type ParseConfidence,
} from "@/lib/ai-output/types"

export {
  getModuleFieldDefinitions,
  getModuleFieldKeys,
  MODULE_FIELD_DEFINITIONS,
} from "@/lib/ai-output/field-mapping"

export {
  buildParserFriendlyOutputHint,
  isParserFriendlyModule,
} from "@/lib/ai-output/output-format-hints"

export {
  computeApplyPlan,
  findFieldConflicts,
  isSupportedAIOutputModule,
  parseAIOutput,
} from "@/lib/ai-output/parse-ai-output"
