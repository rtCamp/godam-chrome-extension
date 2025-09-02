import React, { useEffect } from 'react'

import * as Select from "@radix-ui/react-select";
import {
    CheckWhiteIcon,
    DropdownIcon
} from "../../images/popup/images";

import {
    Building2,
    ArrowRight
} from "lucide-react";

import "../styles/layout/_GoDAMVideos.scss";

const GoDAMVideos = () => {

    const baseUrl = process.env.GODAM_BASE_URL || 'https://app.godam.io';

    const redirectLink = `${baseUrl}/web/media-library`;

    const [orgList, setOrgList] = React.useState([]);
    const [selectedOrg, setSelectedOrg] = React.useState('');

    useEffect(() => {
        (async()=>{
            const orgList = await chrome.runtime.sendMessage({type:"get-organisations"})
            const { selectedOrg } = await chrome.storage.local.get(['selectedOrg'])

            setOrgList(orgList)
            setSelectedOrg(selectedOrg)

        })()
    }, []);

    const handleOrgChange = (value) => {
        setSelectedOrg(value);
        chrome.storage.local.set({ selectedOrg: value });
    };

    return (
        <div className="GoDAMVideos" style={{
            padding: "1rem",
            backgroundColor: "#F6F7FB", // color-light-gray in variables
            marginTop: "1rem"
        }}>
            <Select.Root value={selectedOrg} onValueChange={handleOrgChange}>
                <Select.Trigger className="SelectTrigger">
                    <div className="SelectValue"
                        style={{
                            padding: "0rem 1rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "space-between"
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center"
                            }}
                        >

                            <Select.Icon className="SelectIconDrop" style={{height:"90%"}}>
                                <Building2 style={{
                                    width:"1rem",
                                    height:"1rem",
                                }} />
                            </Select.Icon>
                            <Select.Value
                                placeholder={"Placeholder"}
                            />
                        </div>
                        <Select.Icon>
                            <img src={DropdownIcon} />
                        </Select.Icon>
                    </div>
                </Select.Trigger>
                <Select.Content position="popper" className="SelectContent">
                    <Select.ScrollUpButton className="SelectScrollButton"></Select.ScrollUpButton>
                    <Select.Viewport className="SelectViewport">
                        {orgList.map(({name,role}) => (
                            <SelectItem value={name} key={name} disabled={role.toLowerCase()==="viewer"}>
                                {name}
                            </SelectItem>
                        ))}
                    </Select.Viewport>
                </Select.Content>
            </Select.Root>
            <a
                role="button"
                className="main-button recording-button"
                href={redirectLink}
                target="_blank"
            >
                <span className="main-button-label">
                    Go to Dashboard
                </span>
                <span className="main-button-shortcut">
                    <ArrowRight/>
                </span>
            </a>
        </div>
    );
};

const SelectItem = React.forwardRef(
    ({ children, className, ...props }, forwardedRef) => {
        return (
            <Select.Item className="SelectItem" {...props} ref={forwardedRef}>
                <Select.ItemText>{children}</Select.ItemText>
                <Select.ItemIndicator className="SelectItemIndicator">
                    <img src={CheckWhiteIcon} />
                </Select.ItemIndicator>
            </Select.Item>
        );
    }
);


export default GoDAMVideos