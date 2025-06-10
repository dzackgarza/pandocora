-- theorem-filter.lua
-- A Pandoc filter to convert fenced divs with theorem classes to styled HTML

local theorem_environments = {
  theorem = 'Theorem',
  lemma = 'Lemma',
  proposition = 'Proposition',
  corollary = 'Corollary',
  definition = 'Definition',
  example = 'Example',
  remark = 'Remark',
  note = 'Note',
  proof = 'Proof',
  warning = 'Warning',
  tip = 'Tip'
}

local function sanitize_id(id)
  return (id or ""):gsub("[^%w%-_]", "")
end

-- Function to extract title
local function get_title(div)
  local title = div.attributes['title'] or ''

  if not title or title == '' then
    if div.identifier and div.identifier ~= '' then
      title = div.identifier:gsub('[-_]', ' ')
    end
  end
  return title
end

function Div(div)
  -- Check if this is a theorem-like environment
  local env_type = nil
  for env, _ in pairs(theorem_environments) do
    if div.classes:includes(env) then
      env_type = env
      break
    end
  end

  if not env_type then return nil end -- Not a theorem environment

  local is_proof = env_type == 'proof'

  local title = get_title(div)
  local formatted_title = title and title ~= '' and ' ' .. title or ''

  -- Build Header
  local header_content = {}
  if not is_proof then
    local env_name = theorem_environments[env_type] or 'Theorem'
    table.insert(header_content, pandoc.RawInline('html',
      string.format('<span class="%s-title">%s%s</span>', env_type, env_name, formatted_title)
    ))
  end

  -- Prepare content
  local content = {}
  if #header_content > 0 then
    table.insert(content, pandoc.Para(header_content))
  end

  for _, block in ipairs(div.content) do
    table.insert(content, block)
  end

  -- Prepare attributes
  local attributes = {class = env_type .. ' proofenv'}
  if div.identifier and div.identifier ~= '' then
    attributes.id = sanitize_id(div.identifier) -- Sanitize ID
  end

  if title and title ~= '' and not is_proof then
    attributes['data-title'] = title
  end

  table.insert(attributes.class, env_type .. '-content')

  -- Create new Div
  local new_div = pandoc.Div(
    content,
    attributes
  )

  return new_div
end
