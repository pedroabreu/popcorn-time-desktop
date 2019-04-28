import React, { useEffect, useState } from 'react';
import {
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from 'reactstrap';

type SelectPlayerProps = {
  chromeCastPlayer: Function,
  currentSelection: String,
  onSelect: Function
};

const withCastingDevices = chromeCastPlayer => {
  const [castingDevices, setCastingDevices] = useState([]);

  useEffect(() => {
    async function getCastingDevices() {
      const devices = await chromeCastPlayer.getDevices();
      setCastingDevices(devices);
    }
    getCastingDevices();
  }, []);

  return castingDevices;
};

const SelectPlayer = ({
  chromeCastPlayer,
  currentSelection,
  onSelect
}: SelectPlayerProps) => {
  const castingDevices = withCastingDevices(chromeCastPlayer);

  return (
    <UncontrolledDropdown style={{ float: 'left' }}>
      <DropdownToggle caret>{currentSelection}</DropdownToggle>
      <DropdownMenu>
        <DropdownItem header>Select Player</DropdownItem>
        <DropdownItem
          key="default"
          id="default"
          name="default"
          onClick={onSelect}
        >
          Default
        </DropdownItem>
        <DropdownItem key="vlc" id="vlc" name="vlc" onClick={onSelect}>
          VLC
        </DropdownItem>
        {castingDevices.map(({ id, name }) => (
          <DropdownItem key={id} id={id} name="chromecast" onClick={onSelect}>
            {name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </UncontrolledDropdown>
  );
};

export default SelectPlayer;
